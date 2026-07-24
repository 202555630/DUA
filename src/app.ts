// src/app.ts

import express, {
    type Request,
    type Response,
} from 'express';
import cors from 'cors';
import Papa from 'papaparse';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT || 8080);

const SHEET_CSV_URL =
    process.env.SHEET_CSV_URL?.trim() ||
    'https://docs.google.com/spreadsheets/d/1l1YE4MTuho5VgQXT-QhLiOJbiYvziIK1w1yL8LDMvFw/export?format=csv&gid=0';

app.use(cors());
app.use(express.json());

let cachedLocations: any[] = [];


/**
 * 시트의 카테고리를 통일한다.
 * 소풉샵 등의 오타도 소품샵으로 처리한다.
 */
function normalizeCategory(value: unknown): string {
    const category = String(value ?? '').trim();

    if (category.includes('식당')) {
        return '식당';
    }

    if (category.includes('카페')) {
        return '카페';
    }

    if (
        category.includes('소품') ||
        category.includes('소풉')
    ) {
        return '소품샵';
    }

    return '기타';
}


/**
 * 구글 시트 CSV 데이터를 불러와 메모리에 저장한다.
 */
async function loadData(): Promise<void> {
    const response = await fetch(SHEET_CSV_URL);

    if (!response.ok) {
        throw new Error(
            `구글 시트 요청 실패: ${response.status}`,
        );
    }

    const csv = await response.text();

    const parsed = Papa.parse<any>(csv, {
        header: true,
        skipEmptyLines: 'greedy',

        // 헤더 앞뒤 공백 제거
        transformHeader: (header) =>
            header.trim(),

        // 각 셀의 앞뒤 공백 제거
        transform: (value) =>
            value.trim(),
    });

    if (parsed.errors.length > 0) {
        console.error(
            'CSV 파싱 오류:',
            parsed.errors,
        );

        throw new Error(
            '구글 시트 CSV 파싱 실패',
        );
    }

    cachedLocations = parsed.data
        .map((row) => ({
            ...row,

            id: String(
                row['id (고유번호)'] ?? '',
            ).trim(),

            name: String(
                row['name (이름)'] ?? '',
            ).trim(),

            category: normalizeCategory(
                row['category (카테고리)'],
            ),

            address: String(
                row['address (주소)'] ?? '',
            ).trim(),

            latitude: Number(
                row['latitude (위도)'],
            ),

            longitude: Number(
                row['longitude (경도)'],
            ),

            weather: String(
                row['weather (날씨)'] ?? '',
            ).trim(),

            allText: Object.values(row)
                .join(' ')
                .trim(),
        }))
        .filter(
            (location) =>
                location.id &&
                location.name &&
                Number.isFinite(
                    location.latitude,
                ) &&
                Number.isFinite(
                    location.longitude,
                ),
        );

    if (cachedLocations.length < 3) {
        throw new Error(
            '추천에 사용할 장소가 부족합니다.',
        );
    }

    console.log(
        `✅ 데이터 로드 완료! (${cachedLocations.length}개 장소)`,
    );
}


/**
 * 두 좌표 사이의 직선거리를 km 단위로 계산한다.
 */
function getDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const radians = Math.PI / 180;

    const value =
        0.5 -
        Math.cos(
            (lat2 - lat1) * radians,
        ) /
            2 +
        (
            Math.cos(lat1 * radians) *
            Math.cos(lat2 * radians) *
            (
                1 -
                Math.cos(
                    (lon2 - lon1) *
                        radians,
                )
            )
        ) /
            2;

    return (
        12742 *
        Math.asin(
            Math.sqrt(value),
        )
    );
}


/**
 * 동행인과 날씨에 따라 장소 점수를 계산하고
 * 식당 → 카페 → 소품샵 코스를 생성한다.
 */
function generateCourse(
    region: string,
    companion: string,
    weather: string,
    usedIds: Set<string>,
): any[] {
    if (!cachedLocations.length) {
        return [];
    }

    const scoredLocations =
        cachedLocations
            .filter((location) =>
                location.address.includes(region)
            )
            .map((location) => {
                let score = 10;

                const reasons =
                    new Set<string>();

                const contains = (
                    keywords: string[],
                ): boolean =>
                    keywords.some(
                        (keyword) =>
                            location.allText.includes(
                                keyword,
                            ),
                    );

                /**
                 * 긍정 키워드가 있고 관련 부정 키워드가
                 * 없을 때만 점수를 더한다.
                 */
                const safeAdd = (
                    points: number,
                    message: string,
                    positiveKeywords: string[],
                    negativeKeywords: string[] = [],
                ): void => {
                    if (
                        contains(
                            positiveKeywords,
                        ) &&
                        !contains(
                            negativeKeywords,
                        )
                    ) {
                        score += points;

                        if (message) {
                            reasons.add(
                                message,
                            );
                        }
                    }
                };


                // 시트의 날씨 열과 일치하면 우선 가산점
                if (
                    location.weather.includes(
                        weather,
                    )
                ) {
                    score += 8;

                    reasons.add(
                        `${weather} 날씨에 적합한 장소입니다.`,
                    );
                }


                // 동행인 점수
                if (companion === '가족') {
                    safeAdd(
                        6,
                        '가족이 함께 방문하기 좋습니다.',
                        [
                            '가족 방문 추천',
                            '가족 추천',
                            '키즈 동반',
                        ],
                        [
                            '노키즈존',
                        ],
                    );

                    safeAdd(
                        5,
                        '아기 의자가 마련되어 있습니다.',
                        [
                            '아기의자 구비',
                            '아기 의자 구비',
                            '유아 의자 구비',
                        ],
                        [
                            '아기의자 없음',
                            '아기 의자 없음',
                            '유아 의자 없음',
                            '아기 의자나 식기 없음',
                        ],
                    );

                    safeAdd(
                        3,
                        '유모차로 접근하기 편리합니다.',
                        [
                            '유모차 출입 가능',
                        ],
                        [
                            '유모차 출입 어려움',
                            '유모차 출입 불가',
                        ],
                    );

                    if (
                        contains([
                            '노키즈존',
                            '아기의자 없음',
                            '아기 의자 없음',
                            '유아 의자 없음',
                        ])
                    ) {
                        score -= 15;
                    }
                } else if (
                    companion === '연인' ||
                    companion === '데이트'
                ) {
                    safeAdd(
                        6,
                        '데이트 장소로 어울리는 분위기입니다.',
                        [
                            '데이트',
                            '연인',
                            '오션뷰',
                            '바다 뷰',
                            '분위기 좋음',
                        ],
                    );
                } else if (
                    companion === '친구'
                ) {
                    safeAdd(
                        5,
                        '친구와 방문하기 좋습니다.',
                        [
                            '친구',
                            '단체',
                            '넓은 좌석',
                            '좌석 간격 넓음',
                        ],
                    );
                } else if (
                    companion === '혼자'
                ) {
                    safeAdd(
                        7,
                        '혼자 이용하기 좋은 좌석이 있습니다.',
                        [
                            '1인석',
                            '1인 식사 가능',
                            '바 좌석',
                            '혼자 방문',
                        ],
                    );
                }


                // 날씨별 세부 점수
                if (weather === '비') {
                    safeAdd(
                        5,
                        '비를 피할 수 있는 대기 공간이 있습니다.',
                        [
                            '실내 대기',
                            '대기 공간 존재',
                            '비나 더위 피할 곳 있음',
                            '비, 더위 피할 수 있는',
                        ],
                        [
                            '대기 공간 없음',
                            '피할 곳 없음',
                        ],
                    );

                    safeAdd(
                        3,
                        '차량으로 방문하기 편리합니다.',
                        [
                            '주차 가능',
                            '주차장 있음',
                            '주차장 존재',
                            '공영주차장',
                            '민영주차장',
                        ],
                        [
                            '주차장 없음',
                            '주차 불가',
                            '주차 불가능',
                        ],
                    );

                    if (
                        contains([
                            '야외 대기',
                            '피할 곳 없음',
                            '인도 없음',
                        ])
                    ) {
                        score -= 6;
                    }
                } else if (
                    weather === '맑음'
                ) {
                    safeAdd(
                        6,
                        '맑은 날 전망을 즐기기 좋습니다.',
                        [
                            '바다 뷰',
                            '바다뷰',
                            '오션뷰',
                            '야외',
                            '산책',
                            '전망',
                        ],
                    );
                } else if (
                    weather === '폭염'
                ) {
                    safeAdd(
                        4,
                        '더위를 피할 수 있는 공간이 있습니다.',
                        [
                            '실내 대기',
                            '대기 공간 존재',
                            '더위 피할 곳 있음',
                            '비나 더위 피할 곳 있음',
                        ],
                        [
                            '대기 공간 없음',
                            '피할 곳 없음',
                        ],
                    );

                    if (
                        contains([
                            '야외 대기',
                            '햇빛 아래',
                            '더위 피할 곳 없음',
                        ])
                    ) {
                        score -= 6;
                    }
                }

                if (reasons.size === 0) {
                    reasons.add(
                        '선택 조건과 이동 거리를 종합해 추천되었습니다.',
                    );
                }

                return {
                    ...location,
                    score,
                    recommendationReasons:
                        Array.from(reasons),
                };
            })
            .sort(
                (first, second) =>
                    second.score -
                    first.score,
            );


    const course: any[] = [];
    const categoryOrder = [
        '식당',
        '카페',
        '소품샵',
    ];


    categoryOrder.forEach(
        (category) => {
            const candidates =
                scoredLocations.filter(
                    (location) =>
                        location.category ===
                            category &&
                        !usedIds.has(
                            location.id,
                        ),
                );

            if (!candidates.length) {
                return;
            }

            // 첫 번째 장소 이후부터 거리 감점 적용
            if (course.length > 0) {
                const previous =
                    course[
                        course.length - 1
                    ];

                candidates.sort(
                    (first, second) => {
                        const firstDistance =
                            getDistance(
                                previous.latitude,
                                previous.longitude,
                                first.latitude,
                                first.longitude,
                            );

                        const secondDistance =
                            getDistance(
                                previous.latitude,
                                previous.longitude,
                                second.latitude,
                                second.longitude,
                            );

                        const firstScore =
                            first.score -
                            Math.min(
                                firstDistance * 2,
                                10,
                            );

                        const secondScore =
                            second.score -
                            Math.min(
                                secondDistance * 2,
                                10,
                            );

                        return (
                            secondScore -
                            firstScore
                        );
                    },
                );
            }

            const topCandidates =
                candidates.slice(
                0,
                Math.min(candidates.length, 6)
            );

            const randomIndex = Math.floor(
                Math.random() * topCandidates.length
            );

            const selected = topCandidates[randomIndex];

            usedIds.add(
                selected.id,
            );

            if (course.length > 0) {
                const previous =
                    course[
                        course.length - 1
                    ];

                selected.distanceFromPreviousKm =
                    Number(
                        getDistance(
                            previous.latitude,
                            previous.longitude,
                            selected.latitude,
                            selected.longitude,
                        ).toFixed(2),
                    );
            } else {
                selected.distanceFromPreviousKm =
                    0;
            }

            course.push(selected);
        },
    );

    return course.map(
        (location, index) => ({
            ...location,
            order: index + 1,
        }),
    );
}


/**
 * 서버 상태 확인
 */
app.get(
    '/',
    (
        _req: Request,
        res: Response,
    ) => {
        res.send(
            'DUA 백엔드 정상 구동 중! 🚀',
        );
    },
);


/**
 * 지도 마커용 전체 장소 데이터
 */
app.get(
    '/api/locations',
    (
        _req: Request,
        res: Response,
    ) => {
        res.json({
            count: cachedLocations.length,
            locations: cachedLocations,
        });
    },
);


/**
 * 추천 코스 API
 *
 * 예:
 * /api/recommend-course?companion=가족&weather=비
 */
app.get(
    '/api/recommend-course',
    (
        req: Request,
        res: Response,
    ) => {
        const companion =
            typeof req.query.companion ===
            'string'
                ? req.query.companion.trim()
                : '';

        const weather =
            typeof req.query.weather ===
            'string'
                ? req.query.weather.trim()
                : '';
        
        const region =
            typeof req.query.region === 'string'
                ? req.query.region.trim()
                : '';

        const allowedCompanions = [
            '가족',
            '연인',
            '데이트',
            '친구',
            '혼자',
        ];

        const allowedWeather = [
            '맑음',
            '비',
            '폭염',
        ];

        if (
            !allowedCompanions.includes(
                companion,
            ) ||
            !allowedWeather.includes(
                weather,
            )
        ) {
            res.status(400).json({
                error:
                    'companion 또는 weather 값이 올바르지 않습니다.',
                allowedCompanions,
                allowedWeather,
            });

            return;
        }

        try {
            const usedIds = new Set<string>();

            const courses = [
                generateCourse(
                    region,
                    companion,
                    weather,
                    usedIds,
                ),
                generateCourse(
                    region,
                    companion,
                    weather,
                    usedIds,
                ),
                generateCourse(
                    region,
                    companion,
                    weather,
                    usedIds,
                ),
            ];

            res.json({
                companion,
                weather,
                courses,
            });
        } catch (error) {
            console.error(
                '추천 코스 생성 오류:',
                error,
            );

            res.status(500).json({
                error:
                    '코스를 생성하는 중 서버 오류가 발생했습니다.',
            });
        }
    },
);


/**
 * 구글 시트 데이터가 정상적으로 로드된 후
 * 서버를 실행한다.
 */
loadData()
    .then(() => {
        app.listen(
            PORT,
            () => {
                console.log(
                    `🚀 서버 실행 중: http://localhost:${PORT}`,
                );
            },
        );
    })
    .catch((error) => {
        console.error(
            '❌ 서버 시작 실패:',
            error,
        );

        process.exit(1);
    });