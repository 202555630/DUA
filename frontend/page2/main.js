window.onload = function() {
    // 주소창의 쿼리 스트링(? 이후의 값들)을 가져옴
    const urlParams = new URLSearchParams(window.location.search);
    
    // 'region'이라는 이름으로 넘어온 값을 꺼냄
    const region = urlParams.get('region');

    // 만약 region 값이 존재한다면, 타이틀 텍스트를 교체함
    if (region) {
        document.getElementById('dynamic-region-name').innerText = region;
    } else {
        // 주소창으로 직접 접속해서 데이터가 없는 경우 기본값 처리
        document.getElementById('dynamic-region-name').innerText = "부산";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const tabItems = document.querySelectorAll(".tab-item");
    const tabContents = document.querySelectorAll(".tab-content");

    tabItems.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            tabItems.forEach(item => item.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            tab.classList.add("active");

            if(tabContents[index]) {
                tabContents[index].classList.add("active");
            }

            console.log("Active course: ", index + 1);
        });
    });
});

/* =========================================
   [새로 추가됨] 팀원의 map.js 병합 부분
========================================= */
/**
 * 가상 지도에 마커(코스)들을 동적으로 그려주는 함수
 * @param {Array} courseList - { name: '장소명', x: 0~100, y: 0~100 } 형태의 배열
 */
function displayCourseMarkers(courseList) {
    const mapContainer = document.querySelector('.map-container');
    
    // 기존에 그려져 있던 가상 마커들과 말풍선들 싹 지우기
    const oldMarkers = mapContainer.querySelectorAll('.mock-marker, .mock-infowindow');
    oldMarkers.forEach(el => el.remove());

    // 데이터 배열을 돌면서 마커 새로 꽂기
    courseList.forEach((place) => {
        // 1. 마커 엘리먼트 생성
        const marker = document.createElement('div');
        marker.className = 'mock-marker';
        // 가상 좌표(%) 기반으로 위치 잡기
        marker.style.left = `${place.x}%`;
        marker.style.top = `${place.y}%`;

        // 2. 마커 클릭 시 뜰 말풍선 생성
        const infowindow = document.createElement('div');
        infowindow.className = 'mock-infowindow';
        infowindow.innerText = place.name;
        infowindow.style.left = `${place.x}%`;
        infowindow.style.top = `${place.y}%`;

        // 3. 지도 컨테이너에 추가
        mapContainer.appendChild(marker);
        mapContainer.appendChild(infowindow);
    });
}

/* =========================================
   백엔드 추천 코스 불러오기
========================================= */

async function loadCourse() {
    try {
        // 이전 페이지에서 선택한 값 가져오기 (없으면 기본값)
        const companion = localStorage.getItem("companion") || "연인";
        const weather = localStorage.getItem("weather") || "맑음";

        const res = await fetch(
            `http://localhost:8080/api/recommend-course?companion=${encodeURIComponent(companion)}&weather=${encodeURIComponent(weather)}`
        );

        if (!res.ok) {
            throw new Error("추천 데이터를 가져오지 못했습니다.");
        }

        const data = await res.json();

        const course = data.course;

        document.getElementById("spot1").innerText =
            course[0]?.name || "추천 장소 없음";

        document.getElementById("spot2").innerText =
            course[1]?.name || "추천 장소 없음";

        document.getElementById("spot3").innerText =
            course[2]?.name || "추천 장소 없음";

        // 지도 마커도 같이 표시(좌표가 있다면)
        if (typeof displayCourseMarkers === "function") {
            const markerData = course.map(place => ({
                name: place.name,
                x: place.longitude || 50,
                y: place.latitude || 50
            }));

            displayCourseMarkers(markerData);
        }

    } catch (err) {
        console.error(err);

        document.getElementById("spot1").innerText = "불러오기 실패";
        document.getElementById("spot2").innerText = "-";
        document.getElementById("spot3").innerText = "-";
    }
}

// 페이지가 열리면 자동 실행
document.addEventListener("DOMContentLoaded", loadCourse);