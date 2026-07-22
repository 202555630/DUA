import express, { Request, Response } from 'express';
import cors from 'cors';
import Papa from 'papaparse'; // 🔥 추가된 부분: CSV 파싱 라이브러리

const app = express();
const PORT = 8080;

// 🔥 이 한 줄이면 모든 프론트엔드 연결이 허용됩니다!
app.use(cors());

// 📍 여기에 본인의 구글 스프레드시트 게시 URL(CSV)을 넣으세요!
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7WZeDtRljZjb39jHpVZVuuoNx1Y6awgNImyoHUsBhRznhgAKn_moXxlaiXO6X2nfPCNJ1XAHKdJa4/pub?output=csv';

app.get('/', (req: Request, res: Response) => {
    res.send('DUA 프로젝트 백엔드 서버가 잘 돌아가고 있어요! 🚀');
});

// 🔥 프론트엔드로 보내줄 지도 마커 데이터 (여기가 바뀌었습니다!)
app.get('/api/locations', async (req: Request, res: Response) => {
    try {
        // 1. 구글 시트에서 실시간으로 데이터 가져오기
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();

        // 2. 가져온 CSV 데이터를 JSON으로 변환하기
        Papa.parse(csvText, {
            header: true,         // 첫 줄을 이름표(key)로 사용
            skipEmptyLines: true, // 빈 줄은 무시
            complete: (results) => {
                // 3. 변환된 구글 시트 데이터를 프론트엔드(카카오맵)로 전송!
                res.json(results.data);
            },
            error: (error: any) => {
                console.error('파싱 에러:', error);
                res.status(500).json({ error: '데이터를 변환하는 중 오류가 발생했습니다.' });
            }
        });
    } catch (error) {
        console.error('데이터 불러오기 에러:', error);
        res.status(500).json({ error: '구글 시트 데이터를 불러오는데 실패했습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});