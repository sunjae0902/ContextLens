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

function createPopup(text, x, y) {
  removePopup();

  const popup = document.createElement("div");

  // 팝업 내부 스타일
  popup.style.position = "absolute";
  popup.style.left = `${x}px`;
  popup.style.top = `${y + 8}px`;
  popup.style.background = "#fefefe";
  popup.style.color = "#111";
  popup.style.padding = "12px 16px 12px 16px";
  popup.style.borderRadius = "12px";
  popup.style.fontSize = "14px";
  popup.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  popup.style.maxWidth = "280px";
  popup.style.lineHeight = "1.5";
  popup.style.whiteSpace = "pre-line";
  popup.style.textAlign = "left";
  popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
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
  closeBtn.style.color = "#888";
  closeBtn.addEventListener(
    "mouseenter",
    () => (closeBtn.style.color = "#111")
  );
  closeBtn.addEventListener(
    "mouseleave",
    () => (closeBtn.style.color = "#888")
  );
  closeBtn.addEventListener("click", removePopup);

  popup.appendChild(closeBtn);

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

  // 자동 닫힘 5초
  const timeoutId = setTimeout(() => {
    removePopup();
  }, 10000);

  // 팝업 외 영역 클릭 시 닫기
  const clickOutsideListener = (e) => {
    if (!popup.contains(e.target)) {
      removePopup();
      document.removeEventListener("mousedown", clickOutsideListener);
      clearTimeout(timeoutId);
    }
  };
  document.addEventListener("mousedown", clickOutsideListener);
}

// 선택 시 api 호출
async function handleSelection() {
  const info = getSelectionInfo();
  if (!info) return;

  const pos = getSelectionPosition();
  if (!pos) return;

  console.log("Selection:", info);

  createPopup(`${info.word}\n\nLoading...`, pos.x, pos.y);

  chrome.runtime.sendMessage(
    {
      type: "GET_MEANING",
      word: info.word,
      sentence: info.sentence,
    },
    (response) => {
      if (!response) return;

      const popupText = `${response.meaning}`;

      if (currentPopup) {
        currentPopup.textContent = popupText;
      }
    }
  );
}

// 드래그 선택
document.addEventListener("mouseup", () => {
  setTimeout(handleSelection, 10);
});

// 더블 클릭
document.addEventListener("dblclick", () => {
  setTimeout(handleSelection, 10);
});
