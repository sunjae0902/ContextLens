chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MEANING") {
    const { word, sentence } = request;

    fetchMeaning(word, sentence).then((result) => {
      sendResponse({ meaning: result });
    });

    return true; // async
  }
});

async function fetchMeaning(word, sentence) {
  const response = await fetch("http://localhost:3000/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      word,
      sentence,
    }),
  });

  const data = await response.json();

  return data.explanation;
}