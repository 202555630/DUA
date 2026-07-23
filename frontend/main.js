function selectOption(element) {
    // 클릭된 요소가 속한 줄(options-wrapper) 안의 모든 option-card를 찾음
    const siblings = element.parentElement.querySelectorAll('.option-card');
    
    // 같은 줄에 있는 모든 카드의 선택 상태를 초기화
    siblings.forEach(card => card.classList.remove('selected'));
    
    // 내가 클릭한 카드에만 selected 상태 부여
    element.classList.add('selected');
}