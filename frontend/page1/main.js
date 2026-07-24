// 사용자가 선택한 지역을 저장할 변수
let selectedRegion = "";

function selectOption(element) {
    // 클릭한 카드와 같은 줄에 있는 모든 카드 찾기
    const siblings =
        element.parentElement.querySelectorAll(".option-card");

    // 기존 선택 표시 제거
    siblings.forEach((card) => {
        card.classList.remove("selected");
    });

    // 클릭한 카드 선택 표시
    element.classList.add("selected");

    // HTML의 data-region 값을 저장
    selectedRegion = element.dataset.region;

    console.log("선택한 지역:", selectedRegion);
}

// HTML이 모두 불러와진 후 실행
document.addEventListener("DOMContentLoaded", () => {
    const courseSelectButton =
        document.getElementById("course-select-button");

    courseSelectButton.addEventListener("click", () => {
        if (!selectedRegion) {
            alert("지역을 먼저 선택해주세요.");
            return;
        }

        // 선택한 지역 이름을 page2에 전달
        window.location.href =
            `../page2/index.html?region=${encodeURIComponent(selectedRegion)}`;
    });
});