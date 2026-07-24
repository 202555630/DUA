/**
 * 동행 유형 또는 날씨 카드를 선택한다.
 */
function selectOption(element) {
    const siblings =
        element.parentElement.querySelectorAll(".option-card");

    // 같은 영역에서 기존에 선택된 카드 해제
    siblings.forEach((card) => {
        card.classList.remove("selected");
    });

    // 클릭한 카드 선택
    element.classList.add("selected");
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

    const companion =
        selectedCompanion.dataset.value;

    const weather =
        selectedWeather.dataset.value;

    // URL로 전달할 값 생성
    const params = new URLSearchParams({
        region,
        companion,
        weather
    });

    window.location.href =
        `../page2/index.html?${params.toString()}`;
}