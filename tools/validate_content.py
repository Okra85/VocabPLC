import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_WEEK_KEYS = {
    "id",
    "number",
    "title",
    "difficultyBand",
    "centralQuestion",
    "lessons",
    "vocabulary",
    "passage",
    "historicalParallel",
    "leadershipCase",
    "rhetoricInsight",
    "retrievalBrief",
    "scenarios",
    "argumentDuels",
    "crosswords",
    "clozeTests",
    "conceptConstellation",
    "conceptBracket",
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def validate_week(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    missing = REQUIRED_WEEK_KEYS - set(data)
    require(not missing, f"{path.name} missing keys: {sorted(missing)}")
    require(len(data["vocabulary"]) >= 10, f"{path.name} needs at least 10 vocabulary entries")

    for entry in data["vocabulary"]:
        for key in [
            "definition",
            "etymology",
            "example",
            "historicalAnchor",
            "literaryAnchor",
            "philosophicalAnchor",
            "synonyms",
            "antonyms",
        ]:
            require(key in entry, f"{path.name}:{entry.get('term')} missing {key}")

    for group in ["modern", "historical", "literary"]:
        require(len(data["scenarios"][group]) >= 5, f"{path.name} needs 5 {group} scenarios")

    require(len(data["argumentDuels"]) >= 2, f"{path.name} needs 2 argument duels")
    require(len(data["crosswords"]) >= 2, f"{path.name} needs 2 crosswords")
    require(len(data["clozeTests"]) >= 2, f"{path.name} needs 2 cloze tests")
    require(len(data["conceptBracket"]["concepts"]) == 8, f"{path.name} bracket must have 8 concepts")


def main():
    index = json.loads((ROOT / "content" / "curriculum-index.json").read_text(encoding="utf-8"))
    require(len(index["weeks"]) == 52, "curriculum index must contain 52 weeks")

    for path in sorted((ROOT / "content" / "weeks").glob("week-*.json")):
        validate_week(path)

    print("Content validation passed")


if __name__ == "__main__":
    main()
