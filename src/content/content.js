let currentPopup = null;

function getSelectionInfo() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return null;

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  let node = range.startContainer;

  // text node면 parent element로 이동
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  if (!node) return null;

  const text = node.innerText;
  const index = text.indexOf(selectedText);

  if (index === -1) return null;

  // 문장 시작
  let start = index;
  while (start > 0) {
    const char = text[start - 1];
    if (char === "." || char === "!" || char === "?" || char === "\n") break;
    start--;
  }

  // 문장 끝
  let end = index + selectedText.length;
  while (end < text.length) {
    const char = text[end];
    if (char === "." || char === "!" || char === "?") {
      end++;
      break;
    }
    end++;
  }

  const sentence = text.slice(start, end).trim();

  return {
    word: selectedText,
    sentence: sentence,
  };
}

function getSelectionPosition() {
  const selection = window.getSelection();

  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return {
    x: rect.left + window.scrollX,
    y: rect.bottom + window.scrollY,
  };
}

function removePopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

function createPopup(text, x, y, isError = false) {
  removePopup();

  const popup = document.createElement("div");

  // 팝업 스타일
  popup.style.position = "absolute";
  popup.style.left = `${x}px`;
  popup.style.top = `${y + 8}px`;
  popup.style.background = isError ? "#fee" : "#fefefe";
  popup.style.color = isError ? "#c33" : "#111";
  popup.style.padding = "12px 16px 12px 16px";
  popup.style.borderRadius = "12px";
  popup.style.fontSize = "14px";
  popup.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  popup.style.maxWidth = "280px";
  popup.style.lineHeight = "1.5";
  popup.style.whiteSpace = "pre-line";
  popup.style.textAlign = "left";
  popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
  popup.style.border = isError ? "1px solid #fcc" : "1px solid #eee";
  popup.style.transition = "all 0.2s ease-in-out";
  popup.style.opacity = "0";
  popup.style.transform = "translateY(-5px)";
  popup.style.zIndex = 999999;

  // X 버튼 추가
  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "6px";
  closeBtn.style.right = "10px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "12px";
  closeBtn.style.color = isError ? "#c33" : "#888";
  closeBtn.addEventListener(
    "mouseenter",
    () => (closeBtn.style.color = isError ? "#a22" : "#111")
  );
  closeBtn.addEventListener(
    "mouseleave",
    () => (closeBtn.style.color = isError ? "#c33" : "#888")
  );
  closeBtn.addEventListener("click", removePopup);

  popup.appendChild(closeBtn);

  // 아이콘 추가 (로딩/에러 구분)
  const icon = document.createElement("span");
  icon.style.marginRight = "8px";
  icon.style.fontSize = "16px";
  icon.textContent = isError ? "⚠️" : "";
  popup.appendChild(icon);

  // 텍스트 내용
  const content = document.createElement("div");
  content.textContent = text;
  content.style.paddingTop = "4px";
  popup.appendChild(content);

  document.body.appendChild(popup);
  currentPopup = popup;

  // 등장 애니메이션
  requestAnimationFrame(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0)";
  });

  // ✅ 자동 닫기 기능 완전 제거

  // 팝업 외 영역 클릭 시 닫기
  const clickOutsideListener = (e) => {
    if (!popup.contains(e.target)) {
      removePopup();
      document.removeEventListener("mousedown", clickOutsideListener);
    }
  };
  document.addEventListener("mousedown", clickOutsideListener);
}

// 개선된 선택 처리
async function handleSelection() {
  const info = getSelectionInfo();
  if (!info) {
    console.log("❌ 유효한 텍스트를 선택해주세요");
    return;
  }

  const pos = getSelectionPosition();
  if (!pos) {
    createPopup(
      "선택 위치를 찾을 수 없습니다.",
      pos?.x || 100,
      pos?.y || 100,
      true
    );
    return;
  }

  console.log("📝 Selection:", info);

  // 로딩 팝업 표시
  createPopup(`${info.word}\n\n설명 가져오는 중...`, pos.x, pos.y);

  try {
    chrome.runtime.sendMessage(
      {
        type: "GET_MEANING",
        word: info.word,
        sentence: info.sentence,
      },
      (response) => {
        // chrome.runtime.lastError 체크
        if (chrome.runtime.lastError) {
          console.error("Runtime 오류:", chrome.runtime.lastError.message);
          if (currentPopup) {
            currentPopup.remove();
          }
          createPopup(
            "확장 프로그램과 연결할 수 없습니다.\n확장 프로그램이 활성화되어 있는지 확인해주세요.",
            pos.x,
            pos.y,
            true
          );
          return;
        }

        if (!response) {
          if (currentPopup) {
            currentPopup.remove();
          }
          createPopup(
            "응답을 받지 못했습니다.\n다시 선택해보세요.",
            pos.x,
            pos.y,
            true
          );
          return;
        }

        // 백그라운드 스크립트에서 받은 응답 처리
        if (response.success === false || response.error) {
          const errorMsg = response.error || "알 수 없는 오류가 발생했습니다.";
          if (currentPopup) {
            currentPopup.remove();
          }
          createPopup(errorMsg, pos.x, pos.y, true);
          return;
        }

        // 성공 응답
        const meaning =
          response.explanation ||
          response.meaning ||
          "설명을 가져오지 못했습니다.";
        if (currentPopup) {
          // 기존 팝업 내용 업데이트
          const closeBtn = currentPopup.querySelector("span");
          const icon = currentPopup.querySelector("span:nth-child(2)");
          const content = currentPopup.querySelector("div");

          if (icon) icon.remove();
          if (closeBtn) closeBtn.style.color = "#888";
          currentPopup.style.background = "#fefefe";
          currentPopup.style.color = "#111";
          currentPopup.style.border = "1px solid #eee";
          content.textContent = meaning;
        }
      }
    );
  } catch (error) {
    console.error("handleSelection 오류:", error);
    if (currentPopup) {
      currentPopup.remove();
    }
    createPopup(
      "오류가 발생했습니다.\n브라우저를 새로고침해보세요.",
      pos.x,
      pos.y,
      true
    );
  }
}

// 드래그 선택 (mouseup)
document.addEventListener("mouseup", () => {
  // 50ms 딜레이로 선택 완료 대기
  setTimeout(() => {
    // 선택이 해제된 경우 무시
    if (window.getSelection().toString().trim()) {
      handleSelection();
    }
  }, 50);
});

// 더블 클릭
document.addEventListener("dblclick", (e) => {
  setTimeout(() => {
    handleSelection();
  }, 10);
});

// 키보드 선택 (Shift + 클릭 후 해제 감지)
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection().toString().trim();
  if (selection && !currentPopup) {
    // 100ms 후 선택 처리 (연속 호출 방지)
    clearTimeout(window.selectionTimeout);
    window.selectionTimeout = setTimeout(() => {
      if (window.getSelection().toString().trim()) {
        handleSelection();
      }
    }, 100);
  }
});