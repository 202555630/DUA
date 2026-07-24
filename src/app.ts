import express, { Request, Response } from 'express';
import cors from 'cors';
import Papa from 'papaparse';
import 'dotenv/config'; // 환경변수 사용

const app = express();
const PORT = Number(process.env.PORT || 8080);
const SHEET_CSV_URL = process.env.SHEET_CSV_URL?.trim() || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7WZeDtRljZjb39jHpVZVuuoNx1Y6awgNImyoHUsBhRznhgAKn_moXxlaiXO6X2nfPCNJ1XAHKdJa4/pub?output=csv'; 

app.use(cors());
app.use(express.json());

// 데이터를 저장해둘 공간
let cachedLocations: any[] = [];

// 1. 서버 켤 때 데이터 한 번만 불러오기
async function loadData() {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const csv = await res.text();
        const { data } = Papa.parse<any>(csv, { header: true, transformHeader: h => h.trim() });
        
        cachedLocations = data.filter(d => d['id (고유번호)']).map(d => ({
            ...d,
            id: d['id (고유번호)'],
            name: d['name (이름)'],
            category: d['category (카테고리)'].includes('식당') ? '식당' : d['category (카테고리)'].includes('카페') ? '카페' : '소품샵',
            // 🔥 프론트엔드가 수정하지 않도록 원래 이름(latitude, longitude)으로 완벽 복구!
            latitude: Number(d['latitude (위도)']),
            longitude: Number(d['longitude (경도)']),
            allText: Object.values(d).join(' ') 
        }));
        console.log(`✅ 데이터 로드 완료! (총 ${cachedLocations.length}개 장소)`);
    } catch (error) {
        console.error('데이터 초기 로딩 실패:', error);
    }
}

// 거리 계산 로직
const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const p = 0.017453292519943295;
    const a = 0.5 - Math.cos((lat2 - lat1) * p)/2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a)); 
};

// 추천 알고리즘 함수
function generateCourse(companion: string, weather: string) {
    const scored = cachedLocations.map(loc => {
        let score = 10, reasons = new Set<string>();
        const add = (pts: number, msg: string, keys: string[]) => {
            if (keys.some(k => loc.allText.includes(k))) { score += pts; if (msg) reasons.add(msg); }
        };

        if (companion === '가족') {
            add(6, '가족이 함께 방문하기 좋습니다.', ['가족', '아기', '유아', '키즈 동반']);
            add(-10, '', ['노키즈존', '아기의자 없음']);
        } else if (companion === '연인') {
            add(6, '데이트 장소로 어울리는 분위기입니다.', ['데이트', '연인', '오션뷰', '분위기']);
        } else if (companion === '친구') {
            add(5, '친구와 방문하기 좋습니다.', ['친구', '단체', '넓은 좌석']);
        } else if (companion === '혼자') {
            add(7, '혼자 이용하기 좋은 좌석이 있습니다.', ['1인석', '혼자', '바 좌석']);
        }

        if (weather === '비') {
            add(5, '비를 피할 수 있는 대기 공간이 있습니다.', ['실내', '피할 곳 있음', '주차']);
            add(-6, '', ['야외 대기', '피할 곳 없음', '인도 없음']);
        } else if (weather === '맑음') {
            add(6, '맑은 날 전망을 즐기기 좋습니다.', ['뷰', '오션뷰', '야외', '산책']);
        }

        return { ...loc, score, recommendationReasons: Array.from(reasons) };
    }).sort((a, b) => b.score - a.score);

    let course: any[] = [];
    ['식당', '카페', '소품샵'].forEach(cat => {
        const candidates = scored.filter(l => l.category === cat && !course.includes(l));
        if (!candidates.length) return;

        // 🔥 거리 계산에 들어가는 변수명도 프론트엔드 규격에 맞춰 latitude, longitude로 수정
        if (course.length > 0) {
            const prev = course[course.length - 1];
            candidates.sort((a, b) => {
                const distA = getDist(prev.latitude, prev.longitude, a.latitude, a.longitude);
                const distB = getDist(prev.latitude, prev.longitude, b.latitude, b.longitude);
                return (b.score - Math.min(distB * 2, 10)) - (a.score - Math.min(distA * 2, 10));
            });
        }
        
        const selected = candidates[0];
        if (course.length > 0) {
            const prev = course[course.length - 1];
            selected.distanceFromPreviousKm = Number(getDist(prev.latitude, prev.longitude, selected.latitude, selected.longitude).toFixed(2));
        } else {
            selected.distanceFromPreviousKm = 0;
        }
        course.push(selected);
    });

    return course.map((loc, idx) => ({ ...loc, order: idx + 1 }));
}

// 기존 지도(map.html)를 위한 전체 데이터 전송 API (부활!)
app.get('/api/locations', (req: Request, res: Response) => {
    res.json(cachedLocations);
});

// 새로운 코스 추천 API
app.get('/api/recommend-course', (req: Request, res: Response) => {
    try {
        const { companion, weather } = req.query as { companion: string, weather: string };
        if (!companion || !weather) return res.status(400).json({ error: '조건(companion, weather)을 정확히 입력해주세요.' });

        res.json({ companion, weather, course: generateCourse(companion, weather) });
    } catch (error) {
        res.status(500).json({ error: '서버 에러가 발생했습니다.' });
    }
});

// 서버 실행 시 캐시 데이터부터 로드
app.listen(PORT, async () => {
    await loadData();
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});