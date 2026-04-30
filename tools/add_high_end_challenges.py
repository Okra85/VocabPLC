import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    path = ROOT / "content" / "weeks" / "week-001.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["highEndChallenge"] = {
        "title": "The Academy Crisis",
        "body": "A new headmaster inherits an academy that has lived for years on reputation rather than discipline. Its founders spoke of civic virtue, humane letters, and serious standards, but the faculty culture has grown soft. Several teachers inflate grades to avoid conflict. A small group of parents has learned that public pressure can bend policy. The students are intelligent, but they have been trained to treat rigor as personal hostility.\n\nThe headmaster's first crisis arrives when a senior teacher fails half of an advanced seminar for plagiarized work. The teacher is severe but accurate. Parents organize a campaign accusing the school of elitism and cruelty. Two trustees urge the headmaster to reverse the grades immediately, arguing that the academy cannot afford reputational damage during admissions season. Another adviser warns that capitulation will teach every future student that standards are negotiable under pressure.\n\nThe case has an old shape. Caesar could claim injury and necessity before crossing the Rubicon, but his remedy made lawful process subordinate to personal command. Creon could claim public order, but he confused his decree with justice itself. Macbeth could claim destiny, but ambition taught him to call appetite necessity. The headmaster must act, but the form of action will educate the institution. A merely forceful decision may win the week and lose the school.\n\nYour task is to sort visible advantage from invisible cost. Which concept should govern the decision? Which temptation is most dangerous? Which public explanation would preserve authority without turning reform into theatrical domination?",
        "questions": [
            {
                "prompt": "Which concept should govern the whole decision?",
                "answer": "prudence",
                "choices": ["prudence", "ambition", "expediency", "hubris"],
                "rationale": "Prudence governs timing, proportion, authority, and future consequence. It can include severity, but only severity ordered toward durable reform."
            },
            {
                "prompt": "Which temptation is most dangerous for the headmaster?",
                "answer": "expediency",
                "choices": ["expediency", "civic virtue", "magnanimity", "counsel"],
                "rationale": "Expediency would reverse the grades to relieve immediate pressure while weakening the standards that make the academy legitimate."
            },
            {
                "prompt": "Which historical parallel best warns against solving an immediate problem by damaging the lawful order?",
                "answer": "ambition",
                "choices": ["ambition", "temperance", "counsel", "magnanimity"],
                "rationale": "Caesar's ambition solved his personal danger while making military force the judge of a constitutional dispute."
            },
            {
                "prompt": "Which public explanation would best preserve authority?",
                "answer": "The academy will uphold the grades, review the evidence transparently, and explain that mercy may address individual circumstance but cannot erase the standard.",
                "choices": [
                    "The academy will uphold the grades, review the evidence transparently, and explain that mercy may address individual circumstance but cannot erase the standard.",
                    "The academy will reverse the grades because institutional reputation matters more than one seminar.",
                    "The academy will fire the teacher immediately to show parents that leadership is responsive.",
                    "The academy will refuse all conversation because any criticism of standards is illegitimate."
                ],
                "rationale": "This answer joins authority to evidence, transparency, and proportion. It avoids both surrender and theatrical severity."
            }
        ]
    }
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print("Added Week 1 high-end challenge")


if __name__ == "__main__":
    main()
