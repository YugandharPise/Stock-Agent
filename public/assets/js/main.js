document.getElementById("screenshotForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const response = await fetch("/screenshot", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    console.log("Job submitted successfully.");
  } catch (err) {
    document.getElementById("result").textContent = "Error: " + err.message;
  }
});

// open an SSE connection to receive live logs
const eventSource = new EventSource('/events');

eventSource.onmessage = function(event) {
  const logArea = document.getElementById("result");
  logArea.textContent = event.data; // overwrite instead of append
};

// catch the final document link
eventSource.addEventListener("done", function(event) {
  const link = event.data;

  // show final document link clearly
  const logArea = document.getElementById("result");
  logArea.textContent = "Document ready!";

  const button = document.createElement("button");
  button.textContent = "Open Document";
  button.style.marginTop = "10px";
  button.onclick = () => window.open(link, "_blank");
  document.body.appendChild(button);
});
