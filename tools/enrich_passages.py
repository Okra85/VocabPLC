import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

UPDATES = {
    1: {
        "passage": {
            "title": "The City and the Soul",
            "body": "A city is not ruined first by its enemies, but by the disorder of those who govern it. The old philosophers did not treat politics as machinery alone. They saw the city as the soul written in public letters. If appetite rules inwardly, appetite will soon demand public instruments: flatterers instead of counselors, decrees instead of reasons, victory instead of justice. Law then remains in name, but it becomes the servant of desire.\n\nThe ruler who cannot command himself becomes dangerous precisely because he can command others. Anger acquires guards. Vanity acquires ceremonies. Fear acquires prisons. The just ruler must therefore practice an older and harder art before he governs a household, academy, army, or city: he must learn which part of himself is fit to rule. Reason need not be bloodless, and courage need not be tame, but both must be ordered toward the common good. Otherwise the city magnifies private disorder until one man's lack of measure becomes a public fate."
        },
        "historicalParallel": {
            "title": "Caesar at the Rubicon",
            "body": "Julius Caesar did not cross the Rubicon as a crude adventurer. By 49 BC he was already one of Rome's most gifted commanders, a master of speed, clemency, spectacle, and political debt. His campaigns in Gaul had brought wealth, veterans, and fame, but they also created a problem the Republic could no longer peacefully absorb: a citizen-general whose personal authority rivaled the authority of the state.\n\nThe Rubicon mattered because Roman law forbade a provincial commander from bringing his army into Italy. The river was small; the constitutional meaning was immense. Caesar could plausibly claim that his enemies in the Senate were acting unjustly and that his dignitas was under attack. Yet his answer made the army, rather than lawful process, the judge of the dispute. The result was not merely civil war. It was a demonstration that republican forms could be overwhelmed by exceptional personal command. Caesar's victory solved his danger and deepened Rome's crisis: could law still govern greatness?"
        }
    },
    2: {
        "passage": {
            "title": "A Warrior Before the Gates",
            "body": "The warrior stands before the gates with two enemies: the foe outside the wall and the disordered passion within his breast. Fear counsels flight; rage counsels frenzy. Honor calls him to remain, but honor itself must be examined, for it may serve duty or merely defend a wounded name. The brave man does not forget fear. He gives fear its proper size. Nor does he worship anger. He knows that anger can wear the armor of justice while secretly serving pride.\n\nIn the heroic world, every deed is performed beneath the gaze of comrades, ancestors, women, children, and gods. Such a gaze can make the coward ashamed and the noble steadfast. It can also trap the warrior inside the theater of reputation. The mature fighter must therefore distinguish glory from vanity, courage from exhibition, and shame from moral knowledge. He does not fight because he loves death. He fights because some goods are too high to be surrendered to fear, and too serious to be entrusted to wrath."
        },
        "historicalParallel": {
            "title": "Roman Dignitas",
            "body": "Roman aristocratic life turned reputation into a public instrument. Dignitas was more than vanity; it named the accumulated standing of a family and statesman, earned through office, military service, ancestry, patronage, and visible sacrifice. A noble who lost dignitas lost political force. A noble who pursued it without measure could drag the Republic into vendetta.\n\nThis helps explain why late republican conflict became so explosive. Men such as Marius, Sulla, Pompey, Caesar, Cato, and Cicero did not think of reputation as a private luxury. They saw public honor as inseparable from authority. Insult, prosecution, exile, or exclusion from office could appear not merely inconvenient but intolerable. The Roman honor code produced endurance, courage, and service, yet it also made compromise difficult when dignity seemed at stake. A republic needs citizens who care about honor; it also needs them to survive humiliation without turning the commonwealth into an arena of revenge."
        }
    },
    3: {
        "passage": {
            "title": "The Ordered Soul",
            "body": "The just person is not the one with the loudest grievance, nor the city just because every appetite has been given a public language. Justice begins when the powers of the soul are arranged according to their proper work. Desire seeks food, comfort, possession, and pleasure. Spirit seeks honor, victory, and recognition. Reason asks what is good, fitting, and true. Disorder begins when the lower power seizes the throne and then hires argument to defend its usurpation.\n\nThe same pattern appears in the city. A community may speak constantly of rights and still be ruled by appetite. It may praise courage and still be governed by rage. It may write laws and still bend them toward faction. Justice requires more than equal noise among competing desires. It requires a hierarchy of goods. Each part must perform its proper office, and the ruling part must be worthy to rule. Without inward order, public law becomes only a polished instrument in the hands of disorder."
        },
        "historicalParallel": {
            "title": "Roman Law and Public Memory",
            "body": "Rome's legal achievement was not that Romans were morally superior to other peoples. Their achievement was to make law durable, public, and portable across generations. From the Twelve Tables in the fifth century BC to the later jurists of the imperial period, Roman law gave disputes a language that outlived the moods of particular magistrates. Written forms could be harsh, incomplete, or socially unequal, but they made appeal possible.\n\nThis legal memory mattered because Rome governed a vast and changing world. Contracts, property, citizenship, family authority, inheritance, and public office all required more than force. They required categories stable enough to be recognized. The later European tradition inherited not only Roman statutes but a Roman habit of legal reasoning: define the person, the office, the injury, the obligation, the remedy. Justice remained imperfect, but law became a civilizational memory against arbitrariness."
        }
    },
    4: {
        "passage": {
            "title": "Before Recognition",
            "body": "The tragic man is not blind because no signs exist. The signs are usually abundant: the loyal servant hesitates, the old law resists, the dream troubles sleep, the enemy speaks one true sentence, the child recoils, the city murmurs. He is blind because the signs threaten the story by which he lives. He asks for truth as long as truth promises triumph. When truth demands surrender, he calls it treachery.\n\nTragedy gives this blindness form. The hero often possesses real greatness: courage, intelligence, rank, eloquence, or piety. Yet greatness narrows when it refuses correction. A ruler who identifies himself with law cannot hear justice against his decree. A seeker of knowledge cannot imagine that inquiry may reveal his own guilt. A warrior who lives by honor cannot distinguish disgrace from moral exposure. Recognition arrives, but late. The mind finally sees the pattern after action has hardened into consequence."
        },
        "historicalParallel": {
            "title": "Athens in Sicily",
            "body": "The Sicilian Expedition of 415-413 BC became one of the great historical examples of democratic overreach. Athens, already deep in the Peloponnesian War, voted to send a massive expedition westward against Syracuse. The plan promised wealth, strategic advantage, and imperial glory. It also required Athens to project power across great distance against a difficult enemy while still facing Sparta nearer home.\n\nThucydides presents the decision with tragic intelligence. Nicias warned against the scale and risk of the campaign, but his attempt to frighten the assembly into caution backfired; the Athenians enlarged the expedition. Alcibiades embodied brilliance and appetite, urging ambition while carrying private scandal. Once in Sicily, divided command, local resistance, Spartan intervention, disease, and logistical strain turned imperial confidence into catastrophe. Athens did not merely lose ships and men. It exposed a deeper blindness: success had taught the city to confuse possibility with wisdom."
        }
    },
    5: {
        "passage": {
            "title": "The Public Thing",
            "body": "A republic lives when citizens can say ours without meaning mine. The public thing is not an abstraction floating above households, farms, temples, courts, and armies. It is the shared order that lets private goods exist without becoming private kingdoms. Office is held for a season. Law judges both friend and rival. Victory in debate does not license destruction of the rules by which debate remains possible.\n\nThe decay begins quietly. The citizen becomes a client. The magistrate becomes a broker. The noble calls appetite dignity. The crowd calls resentment justice. Ceremonies continue, titles remain, ancestral words are repeated, but the inward grammar changes. Men still praise the republic while learning how to profit from its weakness. The danger is not only tyranny from above. It is privatization from within: the conversion of common trust into factional property."
        },
        "historicalParallel": {
            "title": "The Late Republic",
            "body": "The late Roman Republic did not collapse because one institution suddenly vanished. Consuls, tribunes, assemblies, courts, priesthoods, and the Senate continued to exist. The deeper crisis was that the habits making those institutions workable were being consumed by conquest, wealth, inequality, military professionalization, and aristocratic rivalry.\n\nRome's Mediterranean victories brought slaves, land, tax contracts, and provincial commands that enriched the elite and strained older citizen ideals. The Gracchi tried reform and met violence. Marius changed recruitment patterns and increased soldiers' dependence on commanders. Sulla marched on Rome and showed that civil conflict could be settled by armies. Pompey, Crassus, and Caesar later made informal power more decisive than republican procedure. No single moment explains the fall. The tragedy lies in accumulation: every emergency created precedents that later ambition could use."
        }
    },
    6: {
        "passage": {
            "title": "What Is Yours",
            "body": "Do not begin with the storm. Begin with the judgment you make about the storm. Wind, insult, loss, illness, exile, and delay arrive from outside. They may wound the body, reduce the estate, alter reputation, or close a road. But they do not by themselves command the ruling center of the soul. Assent gives them a throne within.\n\nThe undisciplined mind adds a second injury to the first. It says: this must not have happened; this proves I am ruined; this insult requires revenge; this loss makes virtue useless. The Stoic exercise is not to pretend that pain is pleasant or injustice harmless. It is to separate the event from the judgment that enslaves. Once separated, duty becomes visible again. One may answer the accuser, tend the sick body, bury the dead, resist the tyrant, or endure the prison. The first freedom is not favorable circumstance. It is the refusal to let circumstance write the law of the soul."
        },
        "historicalParallel": {
            "title": "Marcus Aurelius on Campaign",
            "body": "Marcus Aurelius wrote much of what we call the Meditations while carrying the burdens of imperial rule, not while resting in philosophical retirement. His reign faced war along the Danube frontier, pressure from Germanic and Sarmatian peoples, administrative strain, succession anxieties, and the Antonine plague, which likely devastated population and military capacity across the empire.\n\nThis context matters. The Meditations are not decorative sayings from a comfortable moralist. They are exercises written by a ruler attempting to discipline perception amid fatigue, grief, and command. Marcus repeatedly reminds himself that fame is vapor, death is near, anger is weakness, and duty remains. He does not abolish empire, hierarchy, or coercive office; he tries to place them under reason. The historical tension is real: a Stoic philosopher sat at the summit of imperial power. His writings ask whether inward rule can survive outward command."
        }
    },
    7: {
        "passage": {
            "title": "The Crowd and the Word",
            "body": "Speech may lift a city toward judgment or lower it into appetite. The speaker who respects the people gives them reasons, names costs, remembers limits, and refuses to purchase applause with falsehood. The demagogue gives them enemies. He simplifies pain into accusation, converts uncertainty into rage, and teaches the crowd to experience disagreement as betrayal.\n\nRhetoric is therefore not a decoration added after thought. It is a civic power. Arrangement decides what appears central. Metaphor decides what seems natural. Repetition decides what is remembered. Tone decides whether citizens feel summoned to judgment or released into contempt. A serious education must train the ear to hear not only what is said, but what desire the speech is feeding. The question is never merely, Was it persuasive? The question is, What kind of soul did it ask the listener to become?"
        },
        "historicalParallel": {
            "title": "Athenian Assembly",
            "body": "Classical Athens placed extraordinary weight on public speech. In the assembly, citizens voted on war, alliances, ostracism, finance, expeditions, and policy. In the courts, large juries heard litigants argue without modern professional lawyers. Such institutions required ordinary citizens to judge speeches, and they rewarded those who could frame urgency, danger, honor, and advantage persuasively.\n\nThis made Athens intellectually brilliant and politically vulnerable. Pericles could use rhetoric to give democratic courage disciplined form. Cleon, as Thucydides portrays him, could press anger toward brutality. Alcibiades could transform imperial appetite into glamour. The Mytilenean debate, the Sicilian debate, and many courtroom speeches show that rhetoric was never merely style. It was the medium through which the city perceived reality. Democratic freedom depended on speech, but it also depended on citizens trained not to be conquered by speech."
        }
    },
    8: {
        "passage": {
            "title": "The Map and the Law",
            "body": "The map shows possession, but law must show recognition. A ruler may draw borders with command; he cannot draw loyalty by ink alone. Roads, forts, tax registers, courts, and governors can make distant rule visible, but they do not by themselves make it just. The subject asks a question the map cannot answer: does this order see me as a person, a partner, a citizen, a client, a tool, or a conquered remainder?\n\nEmpire always speaks in large nouns: peace, order, civilization, law, security, destiny. Some of these nouns may describe real goods. Banditry may decline; trade may widen; local elites may enter a broader world. Yet the very scale that enables order also tempts blindness. The center mistakes uniformity for justice. The province learns to obey without belonging. Law becomes legitimate only when it restrains the hand that carries it."
        },
        "historicalParallel": {
            "title": "Roman Citizenship",
            "body": "Roman citizenship began as a status attached to the city of Rome and expanded unevenly across Italy and the empire. After the Social War of 91-87 BC, Rome extended citizenship to Italian allies whose military service and grievances had made exclusion untenable. In AD 212, the emperor Caracalla issued the Constitutio Antoniniana, granting citizenship to nearly all free inhabitants of the empire.\n\nThe expansion was both generous and strategic. Citizenship could dignify subjects, regularize law, increase tax reach, bind local elites to the imperial order, and make Rome seem less like a conqueror and more like a universal commonwealth. Yet citizenship did not erase hierarchy, provincial extraction, slavery, or cultural domination. Its importance lies in the imperial bargain: Rome learned that durable empire required more than conquest. It required forms of membership through which ruled peoples could imagine themselves inside the order that governed them."
        }
    }
}


def main():
    for number, updates in UPDATES.items():
        path = ROOT / "content" / "weeks" / f"week-{number:03}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["passage"] = updates["passage"]
        data["historicalParallel"] = updates["historicalParallel"]
        path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
        print(f"Updated {path.name}")


if __name__ == "__main__":
    main()
