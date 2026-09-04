# Student Performance Explorer

A learning analytics project that explores relationships between students' daily habits and academic performance. It includes a Flask application, interactive visualisations and a Random Forest model that classifies lifestyle profiles using a GPA threshold of 3.0.

## Live demo

The browser demo runs the exported model locally, so no form data leaves the device:

**https://x-muthanna-x.github.io/LA-project/**

## Features

- Explore 2,000 student lifestyle records with interactive charts
- Filter the relationship between study hours and GPA by stress level
- Predict whether a lifestyle profile is associated with a GPA of 3.0 or higher
- Run the trained Random Forest directly in the browser
- Use the original Flask application locally

## Technology

- Python, Flask and pandas
- scikit-learn Random Forest classifier
- Plotly data visualisations
- HTML, CSS and JavaScript browser demo
- GitHub Actions and GitHub Pages

## Run the Flask application

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in a browser.

## Rebuild the browser model

```bash
python web/export_model.py
```

The script retrains the model from the CSV dataset and writes the decision trees to `docs/model.json`.

## Important note

This project is an educational demonstration. Its output is not academic advice and should not be used to evaluate a real student.
