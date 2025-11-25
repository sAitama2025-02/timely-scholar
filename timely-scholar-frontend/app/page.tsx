"use client";
import { useEffect, useState } from "react";
import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type Subject = {
  id?: string;
  name: string;
  attended: number;
  total: number;
  targetAttendance: number;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadSubjects(u);
      } else {
        setSubjects([]);
      }
    });
    return () => unsub();
  }, []);

  const loadSubjects = async (u: User) => {
    const colRef = collection(db, "users", u.uid, "subjects");
    const snap = await getDocs(colRef);
    const list: Subject[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      list.push({
        id: d.id,
        name: data.name,
        attended: data.attended,
        total: data.total,
        targetAttendance: data.targetAttendance ?? 75,
      });
    });
    setSubjects(list);
  };

  const handleSignIn = async () => {
    await signInWithPopup(auth, provider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const addSubject = async () => {
    if (!user) return;
    const name = prompt("Subject name?") || "";
    if (!name) return;
    const colRef = collection(db, "users", user.uid, "subjects");
    const docRef = await addDoc(colRef, {
      name,
      attended: 0,
      total: 0,
      targetAttendance: 75,
    });
    setSubjects((prev) => [
      ...prev,
      { id: docRef.id, name, attended: 0, total: 0, targetAttendance: 75 },
    ]);
  };

  const updateAttendance = async (
    sub: Subject,
    deltaAttended: number,
    deltaTotal: number
  ) => {
    if (!user || !sub.id) return;
    const newAtt = sub.attended + deltaAttended;
    const newTot = sub.total + deltaTotal;
    const docRef = doc(db, "users", user.uid, "subjects", sub.id);
    await updateDoc(docRef, {
      attended: newAtt,
      total: newTot,
    });
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === sub.id ? { ...s, attended: newAtt, total: newTot } : s
      )
    );
  };

  const removeSubject = async (sub: Subject) => {
    if (!user || !sub.id) return;
    const docRef = doc(db, "users", user.uid, "subjects", sub.id);
    await deleteDoc(docRef);
    setSubjects((prev) => prev.filter((s) => s.id !== sub.id));
  };

  const callSuggestion = async () => {
    if (!subjects.length) return;
    setLoading(true);
    setSuggestion("");
    try {
      const res = await fetch(`${BACKEND_URL}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: subjects.map((s) => ({
            name: s.name,
            attended: s.attended,
            total: s.total,
            target_attendance: s.targetAttendance,
          })),
        }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || "No suggestion returned");
    } catch (e: any) {
      setSuggestion("Error calling AI service: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Timely Scholar – AI Timetable & Attendance Planner</h1>

      {!user && (
        <button onClick={handleSignIn} style={{ marginTop: 16 }}>
          Sign in with Google
        </button>
      )}

      {user && (
        <>
          <div style={{ marginTop: 16 }}>
            <span>Signed in as {user.email}</span>
            <button onClick={handleSignOut} style={{ marginLeft: 16 }}>
              Sign out
            </button>
          </div>

          <section style={{ marginTop: 24 }}>
            <h2>Your Subjects</h2>
            <button onClick={addSubject}>+ Add Subject</button>
            <table
              style={{
                width: "100%",
                marginTop: 12,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Attended</th>
                  <th>Total</th>
                  <th>%</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const pct =
                    s.total > 0
                      ? Math.round((s.attended / s.total) * 100)
                      : 0;
                  const low = pct < s.targetAttendance;
                  return (
                   <tr
  key={s.id}
  style={{
    background: "#222222",
    color: "#ffffff",
    borderBottom: "1px solid #555",
  }}
>
                      <td>{s.name}</td>
                      <td>{s.attended}</td>
                      <td>{s.total}</td>
                      <td>{pct}%</td>
                      <td>
                        <button onClick={() => updateAttendance(s, 1, 1)}>
                          Present
                        </button>
                        <button
                          onClick={() => updateAttendance(s, 0, 1)}
                          style={{ marginLeft: 4 }}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => removeSubject(s)}
                          style={{ marginLeft: 4 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!subjects.length && (
                  <tr>
                    <td colSpan={5}>No subjects yet. Add one!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section style={{ marginTop: 24 }}>
            <h2>AI Recommendation</h2>
            <button onClick={callSuggestion} disabled={loading}>
              {loading ? "Getting suggestion..." : "Ask AI for plan"}
            </button>
            {suggestion && (
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
                {suggestion}
              </pre>
            )}
          </section>
        </>
      )}
    </main>
  );
}