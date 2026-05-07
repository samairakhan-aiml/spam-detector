from flask import Flask, render_template, request, redirect, session, jsonify

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import numpy as np
import pandas as pd

app = Flask(__name__)
app.secret_key = "SpamShield_2026_secure"

df = pd.read_csv("mail_data.csv", encoding="latin-1", header=None)

df = df.iloc[:, :2]
df.columns = ["Category", "Message"]

df["Category"] = df["Category"].str.strip().str.lower()
df = df[df["Category"].isin(["spam", "ham"])].copy()
df.dropna(subset=["Message"], inplace=True)
df["Message"] = df["Message"].astype(str).str.strip()

texts  = df["Message"].tolist()
labels = df["Category"].map({"ham": 0, "spam": 1}).tolist()

print(f" Dataset loaded: {len(texts)} messages")
print(f" Ham: {labels.count(0)}  |  Spam: {labels.count(1)}")

X_train, X_test, y_train, y_test = train_test_split(
    texts, labels,
    test_size=0.2,
    random_state=42,
    stratify=labels
)

vectorizer = TfidfVectorizer(
    stop_words="english",
    ngram_range=(1, 2),
    max_features=5000,
    sublinear_tf=True
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

candidates = {
    "Logistic Regression": LogisticRegression(max_iter=1000, C=1.0, solver="lbfgs"),
    "Naive Bayes":         MultinomialNB(),
    "KNN":                 KNeighborsClassifier(n_neighbors=5),
    "Decision Tree":       DecisionTreeClassifier(max_depth=20),
}

MODEL_SCORES = {}
trained_models = {}
all_reports = {}

print("\n" + "="*50)
print("DETAILED MODEL PERFORMANCE")
print("="*50)

for name, clf in candidates.items():
    clf.fit(X_train_vec, y_train)
    y_pred = clf.predict(X_test_vec)
    acc = round(accuracy_score(y_test, y_pred) * 100, 2)
    
    report = classification_report(y_test, y_pred, 
                                 target_names=['Ham', 'Spam'], 
                                 output_dict=True)
    
    MODEL_SCORES[name] = acc
    trained_models[name] = clf
    all_reports[name] = report
    
    print(f"\n{name}:")
    print(f"  Accuracy: {acc}%")
    print(f"  Spam Precision: {report['Spam']['precision']:.3f}")
    print(f"  Spam Recall:    {report['Spam']['recall']:.3f}")
    print(f"  Spam F1:        {report['Spam']['f1-score']:.3f}")
    print(f"  Macro Avg F1:   {report['macro avg']['f1-score']:.3f}")

BEST_MODEL_NAME = max(all_reports, key=lambda x: all_reports[x]['Spam']['f1-score'])
BEST_CLF = trained_models[BEST_MODEL_NAME]
MODEL_ACCURACY = MODEL_SCORES[BEST_MODEL_NAME]

print(f"\n[INFO] Best model by Spam F1: {BEST_MODEL_NAME}")
print(f"[INFO] Best Spam F1-score: {all_reports[BEST_MODEL_NAME]['Spam']['f1-score']:.3f}")

INBOX_EMAILS = [
    {
        "sender":  "HR Department",
        "email":   "hr@company.com",
        "subject": "Internship Offer Letter Ready",
        "preview": "Your internship offer letter is ready. Please visit HR to collect it.",
        "body":    "Your internship offer letter is ready. Please visit HR to collect it at your earliest convenience. Bring a valid ID proof and two photographs.",
        "time":    "9:15 AM",
    },
    {
        "sender":  "Prof. Sharma",
        "email":   "sharma@university.edu",
        "subject": "Project Deadline Extended",
        "preview": "The project deadline has been extended to next Friday. Please update task boards.",
        "body":    "Dear students, the project submission deadline has been extended to next Friday, 5:00 PM. Please ensure all deliverables are complete and upload to the portal.",
        "time":    "8:42 AM",
    },
    {
        "sender":  "Lottery Prize Fund",
        "email":   "prize@lottery-win.net",
        "subject": "WINNER ANNOUNCEMENT — Claim $50,000 Now!",
        "preview": "Your email has won the international lottery. Claim your prize immediately!",
        "body":    "CONGRATULATIONS! Your email address has been randomly selected as the winner of $50,000 in our international lottery draw. To claim your prize, reply with your full name, address, and bank details immediately. This offer expires in 24 hours!",
        "time":    "7:30 AM",
    },
    {
        "sender":  "Team Lead — Ravi",
        "email":   "ravi@office.com",
        "subject": "Standup Meeting Moved to 10 AM",
        "preview": "Hi team, the standup is moved to 10am today. Please update your calendars.",
        "body":    "Hi team, just a heads up that today's standup meeting has been moved from 9:30 AM to 10:00 AM due to a client call. Please update your calendars accordingly. See you all then!",
        "time":    "Yesterday",
    },
    {
        "sender":  "Free Gifts Inc.",
        "email":   "gifts@freeprizes-claim.com",
        "subject": "You Won a FREE iPhone 15 Pro! Click Now",
        "preview": "Congratulations! Complete a 2-minute survey to claim your free iPhone. Limited slots!",
        "body":    "CONGRATULATIONS! You have been selected to win a FREE iPhone 15 Pro! Just complete our 2-minute survey to claim your prize. Only 3 slots remaining! Click the link now before it expires. No credit card required!",
        "time":    "Yesterday",
    },
    {
        "sender":  "Library System",
        "email":   "library@university.edu",
        "subject": "Book Return Reminder",
        "preview": "The library books you borrowed are due next Monday. Please return on time.",
        "body":    "This is a reminder that the following books borrowed under your name are due for return next Monday: 1. Introduction to Machine Learning  2. Python for Data Science. Kindly return or renew them to avoid late fees.",
        "time":    "Mon",
    },
    {
        "sender":  "Priya Kapoor",
        "email":   "priya.k@gmail.com",
        "subject": "Notes from Today's Lecture",
        "preview": "Hey! Sharing my notes from today's ML lecture. Check the attachment.",
        "body":    "Hey! I noticed you missed today's Machine Learning lecture. I am sharing my notes — check the attached PDF. The prof covered TF-IDF and Naive Bayes. There will be a surprise quiz on this next week, so make sure you go through it!",
        "time":    "Mon",
    },
    {
        "sender":  "Crypto Profits NOW",
        "email":   "invest@crypto-double.biz",
        "subject": "Double Your Bitcoin in 24 Hours — Guaranteed!",
        "preview": "Join our exclusive investment group and double your crypto holdings overnight!",
        "body":    "EXCLUSIVE OFFER: Our AI-powered trading bot has a 98% success rate. Double your Bitcoin investment in just 24 hours — GUARANTEED! Join 50,000 happy investors. Send 0.1 BTC to get started and receive 0.2 BTC back. Limited spots available!",
        "time":    "Sun",
    },
    {
        "sender": "Bank Alert",
        "subject": "URGENT: Account Suspended - Verify Now",
        "body": "Your bank account is compromised! Send you login details to support@bank-secure.com to verify.Claim your Rs.5000 Compensations",
    },
    {
        "sender": "Meeting Invite",
        "subject": "Team Sync - Project Update", 
        "body": "Weekly team meeting tomorrow 2PM. Agenda attached.",
    }
]

for em in INBOX_EMAILS:
    text             = em["subject"] + " " + em["body"]
    vec              = vectorizer.transform([text])
    prob             = BEST_CLF.predict_proba(vec)[0]
    pred             = int(np.argmax(prob))
    em["is_spam"]    = bool(pred == 1)
    em["label"]      = "Spam" if pred == 1 else "Ham"
    em["confidence"] = round(float(max(prob)) * 100, 1)

@app.route("/", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        if email and "@" in email and "." in email:
            session["user"] = email
            return redirect("/inbox")
        else:
            error = "Please enter a valid email address."
    return render_template("login.html", error=error)

@app.route("/inbox")
def inbox():
    if "user" not in session:
        return redirect("/")
    spam_count = sum(1 for e in INBOX_EMAILS if e["is_spam"])
    ham_count  = len(INBOX_EMAILS) - spam_count
    return render_template(
        "inbox.html",
        emails=INBOX_EMAILS,
        user=session["user"],
        spam_count=spam_count,
        ham_count=ham_count,
        total=len(INBOX_EMAILS),
        model_accuracy=MODEL_ACCURACY,
        model_scores=MODEL_SCORES,
        best_model=BEST_MODEL_NAME,
        model_reports=all_reports,
    )

@app.route("/check", methods=["POST"])
def check():
    message = request.form.get("message", "").strip()
    if not message:
        return jsonify({"error": "No message provided"}), 400

    vec  = vectorizer.transform([message])
    prob = BEST_CLF.predict_proba(vec)[0]
    pred = int(np.argmax(prob))

    return jsonify({
        "label":      "Spam" if pred == 1 else "Ham",
        "confidence": round(float(max(prob)) * 100, 1),
        "is_spam":    bool(pred == 1),
        "ham_prob":   round(float(prob[0]) * 100, 1),
        "spam_prob":  round(float(prob[1]) * 100, 1),
        "model":      BEST_MODEL_NAME,
    })

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
