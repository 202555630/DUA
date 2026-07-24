let selectedCompanion = "";
let selectedWeather = "";

// 동행 유형 또는 날씨 카드를 선택한다.
function selectOption(element) {

    const siblings = element.parentElement.querySelectorAll(".option-card");

    siblings.forEach(card => card.classList.remove("selected"));

    element.classList.add("selected");

    const value = element.dataset.value;

    if (element.parentElement.id === "companion-options") {
        selectedCompanion = value;
    }

    if (element.parentElement.id === "weather-options") {
        selectedWeather = value;
    }
}


/**
 * 선택한 조건을 page2로 전달한다.
 */
function goToPage2() {
    // 지역
    const region =
        document.getElementById("region-select").value;

    // 동행 유형
    const selectedCompanion = document.querySelector(
        "#companion-options .option-card.selected"
    );

    // 날씨
    const selectedWeather = document.querySelector(
        "#weather-options .option-card.selected"
    );

    if (!region) {
        alert("지역을 선택해주세요.");
        return;
    }

    if (!selectedCompanion) {
        alert("동행 유형을 선택해주세요.");
        return;
    }

    if (!selectedWeather) {
        alert("날씨를 선택해주세요.");
        return;
    }

    const companion = selectedCompanion.dataset.value;
    const weather = selectedWeather.dataset.value;

    // Page2에서도 쉽게 사용할 수 있도록 저장
    localStorage.setItem("region", region);
    localStorage.setItem("companion", companion);
    localStorage.setItem("weather", weather);
    
    // URL로 전달할 값 생성
    const params = new URLSearchParams({
        region,
        companion,
        weather
    });

    window.location.href =
        `../page2/index.html?${params.toString()}`;
}