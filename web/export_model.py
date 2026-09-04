"""Train the project model and export it for the browser demo."""

import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[1]
FEATURES = [
    "Study_Hours_Per_Day",
    "Sleep_Hours_Per_Day",
    "Social_Hours_Per_Day",
    "Stress_Level",
    "Physical_Activity_Hours_Per_Day",
]


def export_tree(estimator):
    tree = estimator.tree_
    return {
        "childrenLeft": tree.children_left.tolist(),
        "childrenRight": tree.children_right.tolist(),
        "feature": tree.feature.tolist(),
        "threshold": tree.threshold.tolist(),
        "values": tree.value[:, 0, :].tolist(),
    }


def browser_tree_probability(tree, values):
    node = 0
    while tree["childrenLeft"][node] != -1:
        feature = tree["feature"][node]
        node = (
            tree["childrenLeft"][node]
            if values[feature] <= tree["threshold"][node]
            else tree["childrenRight"][node]
        )
    votes = tree["values"][node]
    return votes[1] / sum(votes)


def main():
    frame = pd.read_csv(ROOT / "data" / "student_lifestyle_dataset.csv")
    inputs = frame[FEATURES].copy()
    inputs["Stress_Level"] = (
        inputs["Stress_Level"]
        .fillna("Low")
        .map({"Low": 0, "Moderate": 1, "Medium": 1, "High": 2})
    )
    inputs = inputs.fillna(inputs.mean(numeric_only=True))
    target = (frame["GPA"] >= 3.0).astype(int)

    x_train, x_test, y_train, y_test = train_test_split(
        inputs, target, test_size=0.2, random_state=42
    )
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(x_train, y_train)

    trees = [export_tree(tree) for tree in model.estimators_]
    payload = {
        "features": FEATURES,
        "classes": model.classes_.tolist(),
        "accuracy": round(float(accuracy_score(y_test, model.predict(x_test))), 4),
        "sampleCount": len(frame),
        "trees": trees,
    }

    browser_probabilities = [
        sum(
            browser_tree_probability(tree, row.astype("float32").tolist())
            for tree in trees
        )
        / len(trees)
        for _, row in x_test.iloc[:100].iterrows()
    ]
    python_probabilities = model.predict_proba(x_test.iloc[:100])[:, 1]
    assert all(
        abs(browser_value - python_value) < 1e-12
        for browser_value, python_value in zip(browser_probabilities, python_probabilities)
    )

    output = ROOT / "docs" / "model.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Exported {len(payload['trees'])} trees to {output}")


if __name__ == "__main__":
    main()
