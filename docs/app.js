const state = { rows: [], model: null };

const chartConfig = {
  displayModeBar: false,
  responsive: true,
};

const chartLayout = {
  margin: { l: 48, r: 20, t: 25, b: 50 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "DM Sans, sans-serif", color: "#60716b", size: 12 },
  xaxis: { gridcolor: "#edf1ed", zeroline: false },
  yaxis: { gridcolor: "#edf1ed", zeroline: false },
};

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const fields = header.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  });
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderCharts(filter = "All") {
  const visible = filter === "All" ? state.rows : state.rows.filter((row) => row.Stress_Level === filter);
  const colors = { Low: "#58b88a", Moderate: "#f3c85b", High: "#e4775d" };

  const groups = ["Low", "Moderate", "High"].map((level) => ({
    level,
    rows: visible.filter((row) => row.Stress_Level === level),
  }));

  Plotly.react("scatter-chart", groups.map((group) => ({
    x: group.rows.map((row) => Number(row.Study_Hours_Per_Day)),
    y: group.rows.map((row) => Number(row.GPA)),
    text: group.rows.map((row) => `${group.level} stress`),
    name: group.level,
    mode: "markers",
    type: "scatter",
    marker: { color: colors[group.level], size: 8, opacity: 0.72 },
    hovertemplate: "%{x} study hours<br>GPA %{y}<br>%{text}<extra></extra>",
  })), {
    ...chartLayout,
    xaxis: { ...chartLayout.xaxis, title: "Study hours per day" },
    yaxis: { ...chartLayout.yaxis, title: "GPA", range: [1.8, 4.1] },
    legend: { orientation: "h", y: 1.12 },
  }, chartConfig);

  const allGroups = ["Low", "Moderate", "High"].map((level) => ({
    level,
    rows: state.rows.filter((row) => row.Stress_Level === level),
  }));

  Plotly.react("stress-chart", [{
    labels: allGroups.map((group) => group.level),
    values: allGroups.map((group) => group.rows.length),
    type: "pie",
    hole: 0.64,
    marker: { colors: allGroups.map((group) => colors[group.level]) },
    textinfo: "percent",
    hovertemplate: "%{label}: %{value} students<extra></extra>",
  }], {
    ...chartLayout,
    margin: { l: 20, r: 20, t: 15, b: 15 },
    showlegend: true,
    legend: { orientation: "h", x: 0.1, y: -0.03 },
  }, chartConfig);

  Plotly.react("gpa-chart", [{
    x: allGroups.map((group) => group.level),
    y: allGroups.map((group) => average(group.rows.map((row) => Number(row.GPA)))),
    type: "bar",
    marker: { color: allGroups.map((group) => colors[group.level]), cornerradius: 6 },
    hovertemplate: "%{x}: %{y:.2f} average GPA<extra></extra>",
  }], {
    ...chartLayout,
    margin: { l: 45, r: 20, t: 15, b: 45 },
    yaxis: { ...chartLayout.yaxis, title: "Average GPA", range: [0, 4] },
  }, chartConfig);
}

function predictTree(tree, input) {
  let node = 0;
  while (tree.childrenLeft[node] !== -1) {
    const feature = tree.feature[node];
    node = input[feature] <= tree.threshold[node] ? tree.childrenLeft[node] : tree.childrenRight[node];
  }
  const votes = tree.values[node];
  return votes[1] / (votes[0] + votes[1]);
}

function predictForest(input) {
  const normalizedInput = input.map(Math.fround);
  const passProbability = state.model.trees.reduce((sum, tree) => sum + predictTree(tree, normalizedInput), 0) / state.model.trees.length;
  return { prediction: passProbability >= 0.5 ? 1 : 0, confidence: passProbability };
}

function handlePrediction(event) {
  event.preventDefault();
  if (!state.model) return;

  const values = new FormData(event.currentTarget);
  const input = ["study", "sleep", "social", "stress", "physical"].map((name) => Number(values.get(name)));
  const total = input[0] + input[1] + input[2] + input[4];
  const resultBox = document.getElementById("prediction-result");

  if (total > 24) {
    resultBox.className = "prediction-result fail";
    resultBox.querySelector("strong").textContent = "Check the daily hours";
    resultBox.querySelector("p").textContent = "Study, sleep, social and physical activity cannot add up to more than 24 hours.";
    return;
  }

  const { prediction, confidence } = predictForest(input);
  const shownConfidence = prediction ? confidence : 1 - confidence;
  resultBox.className = `prediction-result ${prediction ? "pass" : "fail"}`;
  resultBox.querySelector("strong").textContent = prediction ? "Likely pass" : "At-risk profile";
  resultBox.querySelector("p").textContent = `The model assigns this classification a probability of ${Math.round(shownConfidence * 100)}%.`;
}

async function start() {
  try {
    const [csvResponse, modelResponse] = await Promise.all([
      fetch("data/student_lifestyle_dataset.csv"),
      fetch("model.json"),
    ]);
    if (!csvResponse.ok || !modelResponse.ok) throw new Error("Project data could not be loaded.");

    state.rows = parseCsv(await csvResponse.text());
    state.model = await modelResponse.json();
    document.getElementById("sample-count").textContent = state.rows.length.toLocaleString();
    document.getElementById("hero-sample-count").textContent = state.rows.length.toLocaleString();
    document.getElementById("model-accuracy").textContent = `${Math.round(state.model.accuracy * 100)}%`;
    renderCharts();
  } catch (error) {
    document.getElementById("prediction-result").querySelector("strong").textContent = "Demo could not load";
    document.getElementById("prediction-result").querySelector("p").textContent = error.message;
  }
}

document.getElementById("stress-filter").addEventListener("change", (event) => renderCharts(event.target.value));
document.getElementById("prediction-form").addEventListener("submit", handlePrediction);
start();
