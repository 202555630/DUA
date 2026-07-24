document.addEventListener("DOMContentLoaded", () => {
    // 1페이지에서 URL로 전달한 필터값 가져오기
    const urlParams =
        new URLSearchParams(window.location.search);

    const region =
        urlParams.get("region") || "부산";

    const companion =
        urlParams.get("companion");

    const weather =
        urlParams.get("weather");

    // 페이지 제목 변경
    updateRegionTitle(region);

    // 실제 map.html에도 선택 조건 전달
    updateMapIframe(region, companion, weather);

    // 추천 코스 불러오기
    loadCourse(region, companion, weather);

    // 코스 탭 기능 설정
    setupTabs();
});


/**
 * 페이지 제목의 지역 이름을 변경한다.
 */
function updateRegionTitle(region) {
    const regionNameElement =
        document.getElementById("dynamic-region-name");

    if (regionNameElement) {
        regionNameElement.textContent = region;
    }
}


/**
 * iframe으로 불러오는 map.html에
 * 지역, 동행 유형, 날씨 값을 전달한다.
 */
function updateMapIframe(
    region,
    companion,
    weather
) {
    const mapFrame =
        document.getElementById("map-frame");

    if (!mapFrame) {
        console.warn(
            "id가 map-frame인 iframe을 찾지 못했습니다."
        );

        return;
    }

    const params = new URLSearchParams({
        region: region,
        companion: companion || "",
        weather: weather || ""
    });

    mapFrame.src =
        `../map.html?${params.toString()}`;
}


/**
 * 백엔드 추천 API에서 코스를 불러온다.
 */
async function loadCourse(
    region,
    companion,
    weather
) {
    if (!companion || !weather) {
        showCourseMessage(
            "선택한 필터 정보가 없습니다.",
            "-",
            "-"
        );

        console.error(
            "companion 또는 weather 값이 없습니다.",
            {
                region,
                companion,
                weather
            }
        );

        return;
    }

    try {
        const params = new URLSearchParams({
            region: region,
            companion: companion,
            weather: weather
        });

        const response = await fetch(
            `http://localhost:8080/api/recommend-course?${params.toString()}`
        );

        if (!response.ok) {
            let errorMessage =
                "추천 데이터를 가져오지 못했습니다.";

            try {
                const errorData =
                    await response.json();

                if (errorData.error) {
                    errorMessage =
                        errorData.error;
                }
            } catch (error) {
                console.error(
                    "오류 응답을 읽지 못했습니다.",
                    error
                );
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        const course =
            Array.isArray(data.course)
                ? data.course
                : [];

        displayCourse(course);

        console.log("선택한 필터:", {
            region,
            companion,
            weather
        });

        console.log(
            "백엔드 추천 결과:",
            course
        );

    } catch (error) {
        console.error(
            "추천 코스 불러오기 실패:",
            error
        );

        showCourseMessage(
            "추천 코스를 불러오지 못했습니다.",
            "-",
            "-"
        );
    }
}


/**
 * 추천받은 코스 이름을 화면에 표시한다.
 */
function displayCourse(course) {
    const spot1 =
        document.getElementById("spot1");

    const spot2 =
        document.getElementById("spot2");

    const spot3 =
        document.getElementById("spot3");

    if (spot1) {
        spot1.textContent =
            course[0]?.name ||
            "추천 장소 없음";
    }

    if (spot2) {
        spot2.textContent =
            course[1]?.name ||
            "추천 장소 없음";
    }

    if (spot3) {
        spot3.textContent =
            course[2]?.name ||
            "추천 장소 없음";
    }
}


/**
 * 오류 또는 안내 문구를 코스 영역에 표시한다.
 */
function showCourseMessage(
    firstMessage,
    secondMessage,
    thirdMessage
) {
    const spot1 =
        document.getElementById("spot1");

    const spot2 =
        document.getElementById("spot2");

    const spot3 =
        document.getElementById("spot3");

    if (spot1) {
        spot1.textContent =
            firstMessage;
    }

    if (spot2) {
        spot2.textContent =
            secondMessage;
    }

    if (spot3) {
        spot3.textContent =
            thirdMessage;
    }
}


/**
 * ①, ②, ③ 탭 선택 기능
 */
function setupTabs() {
    const tabItems =
        document.querySelectorAll(
            ".tab-item"
        );

    const tabContents =
        document.querySelectorAll(
            ".tab-content"
        );

    tabItems.forEach(
        (tab, index) => {
            tab.addEventListener(
                "click",
                () => {
                    tabItems.forEach(
                        (item) => {
                            item.classList.remove(
                                "active"
                            );
                        }
                    );

                    tabContents.forEach(
                        (content) => {
                            content.classList.remove(
                                "active"
                            );
                        }
                    );

                    tab.classList.add(
                        "active"
                    );

                    if (
                        tabContents[index]
                    ) {
                        tabContents[
                            index
                        ].classList.add(
                            "active"
                        );
                    }

                    console.log(
                        "선택한 코스:",
                        index + 1
                    );
                }
            );
        }
    );
}