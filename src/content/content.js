let currentPopup = null;
let isLoading = false;

// spinner style
if (!document.getElementById("dict-spinner-style")) {
  const style = document.createElement("style");
  style.id = "dict-spinner-style";
  style.textContent = `
  .dict-spinner{
    width:14px;
    height:14px;
    border:2px solid #555;
    border-top:2px solid #fff;
    border-radius:50%;
    animation:dict-spin 0.8s linear infinite;
  }

  @keyframes dict-spin{
    from{transform:rotate(0deg)}
    to{transform:rotate(360deg)}
  }
  `;
  document.head.appendChild(style);
}

function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  let node = range.startContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  if (!node) return null;

  const text = node.innerText;
  const index = text.indexOf(selectedText);

  if (index === -1) return null;

  let start = index;
  while (start > 0) {
    const char = text[start - 1];
    if (char === "." || char === "!" || char === "?" || char === "\n") break;
    start--;
  }

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

function createPopup(x, y, isError = false) {
  removePopup();

  const popup = document.createElement("div");

  Object.assign(popup.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y + 12}px`,
    background: isError ? "rgba(45,20,20,0.95)" : "rgba(30,30,32,0.98)",
    color: isError ? "#ff9999" : "#e0e0e0",
    padding: "16px",
    borderRadius: "14px",
    fontSize: "14px",
    maxWidth: "300px",
    lineHeight: "1.6",
    boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
    border: isError ? "1px solid #663333" : "1px solid #444",
    opacity: "0",
    transform: "translateY(-8px)",
    transition: "all .25s",
    zIndex: "2147483647",
  });

  const content = document.createElement("div");
  content.className = "dict-content";

  content.innerHTML = `
    <div class="dict-spinner"></div>
  `;

  popup.appendChild(content);

  document.body.appendChild(popup);
  currentPopup = popup;

  requestAnimationFrame(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0)";
  });
}

function updatePopup(meaning) {
  if (!currentPopup) return;

  const content = currentPopup.querySelector(".dict-content");

  content.innerHTML = `
  <div style="color:#bbb">
  ${meaning}
  </div>
  `;
}

async function handleSelection() {
  if (isLoading) return;

  const info = getSelectionInfo();
  if (!info) return;

  const pos = getSelectionPosition();
  if (!pos) return;

  isLoading = true;

  createPopup(pos.x, pos.y);

  try {
    chrome.runtime.sendMessage(
      {
        type: "GET_MEANING",
        word: info.word,
        sentence: info.sentence,
      },
      (response) => {
        isLoading = false;

        if (chrome.runtime.lastError) {
          updatePopup("확장 프로그램 연결 오류");
          return;
        }

        if (!response) {
          updatePopup("응답을 받지 못했습니다.");
          return;
        }

        const meaning =
          response.explanation ||
          response.meaning ||
          "설명을 가져오지 못했습니다.";

        updatePopup(meaning);
      }
    );
  } catch (error) {
    isLoading = false;
    updatePopup("오류가 발생했습니다.");
  }
}

document.addEventListener("mouseup", () => {
  setTimeout(() => {
    if (window.getSelection().toString().trim()) {
      handleSelection();
    }
  }, 50);
});

document.addEventListener("dblclick", () => {
  setTimeout(handleSelection, 10);
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection().toString().trim();

  if (selection && !currentPopup) {
    clearTimeout(window.selectionTimeout);

    window.selectionTimeout = setTimeout(() => {
      if (window.getSelection().toString().trim()) {
        handleSelection();
      }
    }, 100);
  }
});

// 바깥 영역 닫기
document.addEventListener("mousedown", (e) => {
  if (!currentPopup) return;

  // 팝업 내부 클릭이면 무시
  if (currentPopup.contains(e.target)) return;

  // 바깥 클릭이면 닫기
  removePopup();
});

// esc키로 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    removePopup();
  }
});
