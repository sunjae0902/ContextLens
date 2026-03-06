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

  popup.textContent = text;

  popup.style.position = "absolute";
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;

  popup.style.background = "#111";
  popup.style.color = "#fff";
  popup.style.padding = "8px 12px";
  popup.style.borderRadius = "6px";
  popup.style.fontSize = "13px";
  popup.style.maxWidth = "260px";

  popup.style.lineHeight = "1.4";
  popup.style.whiteSpace = "pre-line";

  popup.style.zIndex = 999999;
  popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";

  document.body.appendChild(popup);

  currentPopup = popup;

  // 자동 닫힘
  setTimeout(() => {
    removePopup();
  }, 4000);
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

      const popupText = `${info.word}\n\n${response.meaning}`;

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
