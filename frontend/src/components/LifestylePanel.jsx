import React from "react";

function buildLifestyleSuggestions(metrics) {
  if (!metrics) return { diet: [], exercise: [] };

  const diet = [];
  const exercise = [];

  if (metrics.HbA1c != null) {
    const v = metrics.HbA1c;
    if (v >= 6.5) {
      diet.push(
        "Limit sweets, desserts, sugary drinks and juices.",
        "Prefer complex carbs: millets, brown rice, whole wheat, oats.",
        "Increase vegetables, salads, dals and sprouts with each meal.",
        "Avoid frequent snacking; keep fixed meal timings."
      );
      exercise.push(
        "Walk 30–45 minutes most days of the week.",
        "Add light strength training 2–3 times/week.",
        "Avoid long sitting; stand/move every 45–60 minutes."
      );
    } else if (v >= 5.7) {
      diet.push(
        "Reduce refined carbs (white rice, bakery items, fried snacks).",
        "Swap sugary drinks with water, buttermilk or sugar-free lime water.",
        "Include protein each meal (eggs, paneer, curd, dals, sprouts, nuts)."
      );
      exercise.push(
        "Walk at least 30 minutes daily (can be 2 × 15 minutes).",
        "Use stairs when possible and increase daily steps gradually."
      );
    } else {
      diet.push(
        "Maintain balanced meals: 1/2 plate vegetables, 1/4 protein, 1/4 carbs.",
        "Stay hydrated and avoid regular sugary drinks."
      );
      exercise.push(
        "Continue regular physical activity (walking, sports, cycling).",
        "Add 2–3 days of yoga or strength training for flexibility and strength."
      );
    }
  }

  if (metrics.FastingGlucose != null && metrics.FastingGlucose >= 100) {
    diet.push(
      "Finish dinner 2–3 hours before sleep.",
      "Keep dinner lighter with more vegetables and protein, less rice/roti."
    );
    exercise.push(
      "Take a 10–15 minute walk after dinner to help fasting sugar."
    );
  }

  if (metrics.PPGlucose != null && metrics.PPGlucose >= 140) {
    diet.push(
      "Reduce portion of high-carb items in the meal (rice, chapati, sweets).",
      "Combine carbs with protein and fiber (dal + sabzi + salad)."
    );
    exercise.push(
      "Do a gentle 10–15 minute walk after main meals to reduce spikes."
    );
  }

  if (metrics.Creatinine != null && metrics.Creatinine > 1.2) {
    diet.push(
      "Avoid self-medicating with painkillers or herbal supplements.",
      "Drink adequate water unless doctor has given fluid restriction."
    );
    exercise.push(
      "Prefer moderate regular activity; avoid sudden very intense workouts without medical advice."
    );
  }

  return {
    diet: Array.from(new Set(diet)),
    exercise: Array.from(new Set(exercise)),
  };
}

export default function LifestylePanel({ summary }) {
  if (!summary || !summary.metrics) return null;

  const { diet, exercise } = buildLifestyleSuggestions(summary.metrics);
  if (!diet.length && !exercise.length) return null;

  return (
    <div className="card mt-4">
      <h3 className="text-lg font-semibold mb-1">Lifestyle suggestions</h3>
      <p className="text-xs text-gray-500 mb-3">
        Simple diet and activity tips from the report values. This is not a
        prescription; follow your doctor/dietician&apos;s advice.
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {diet.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1">Diet</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
              {diet.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {exercise.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1">Activity</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
              {exercise.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
