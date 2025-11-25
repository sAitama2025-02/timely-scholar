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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");  // ADD THIS

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
    try {
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
    } catch (e: any) {
      console.error("Load subjects error:", e);
      setError("Failed to load subjects: " + e.message);
    }
  };

  const handleSignIn = async () => {
    try {
      setError("");
      console.log("Attempting sign in...");  // Debug log
      await signInWithPopup(auth, provider);
      console.log("Sign in successful");
    } catch (e: any) {
      console.error("Sign in error:", e);
      setError("Sign in failed: " + e.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      console.error("Sign out error:", e);
      setError("Sign out failed: " + e.message);
    }
  };

  const addSubject = async () => {
    if (!user) return;
    const name = prompt("Subject name?") || "";
    if (!name) return;
    try {
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
    } catch (e: any) {
      console.error("Add subject error:", e);
      setError("Failed to add subject: " + e.message);
    }
  };

  const updateAttendance = async (
    sub: Subject,
    deltaAttended: number,
    deltaTotal: number
  ) => {
    if (!user || !sub.id) return;
    try {
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
    } catch (e: any) {
      console.error("Update error:", e);
      setError("Failed to update attendance: " + e.message);
    }
  };

  const removeSubject = async (sub: Subject) => {
    if (!user || !sub.id) return;
    try {
      const docRef = doc(db, "users", user.uid, "subjects", sub.id);
      await deleteDoc(docRef);
      setSubjects((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (e: any) {
      console.error("Remove error:", e);
      setError("Failed to remove subject: " + e.message);
    }
  };

  const callSuggestion = async () => {
    if (!subjects.length) return;
    setLoading(true);
    setSuggestion("");
    setError("");
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
      
      {/* ERROR DISPLAY */}
      {error && (
        <div style={{ background: "#ff4444", color: "white", padding: 12, marginTop: 12, borderRadius: 4 }}>
          {error}
        </div>
      )}

      {!user && (
        <button type="button" onClick={handleSignIn} style={{ marginTop: 16 }}>
          Sign in with Google
        </button>
      )}

      {user && (
        <>
          <div style={{ marginTop: 16 }}>
            <span>Signed in as {user.email}</span>
            <button type="button" onClick={handleSignOut} style={{ marginLeft: 16 }}>
              Sign out
            </button>
          </div>

          <section style={{ marginTop: 24 }}>
            <h2>Your Subjects</h2>
            <button type="button" onClick={addSubject}>+ Add Subject</button>
            <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
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
                  const pct = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0;
                  return (
                    <tr key={s.id} style={{ background: "#222222", color: "#ffffff", borderBottom: "1px solid #555" }}>
                      <td>{s.name}</td>
                      <td>{s.attended}</td>
                      <td>{s.total}</td>
                      <td>{pct}%</td>
                      <td>
                        <button type="button" onClick={() => updateAttendance(s, 1, 1)}>Present</button>
                        <button type="button" onClick={() => updateAttendance(s, 0, 1)} style={{ marginLeft: 4 }}>Absent</button>
                        <button type="button" onClick={() => removeSubject(s)} style={{ marginLeft: 4 }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
                {!subjects.length && (
                  <tr><td colSpan={5}>No subjects yet. Add one!</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section style={{ marginTop: 24 }}>
            <h2>AI Recommendation</h2>
            <button type="button" onClick={callSuggestion} disabled={loading}>
              {loading ? "Getting suggestion..." : "Ask AI for plan"}
            </button>
            {suggestion && (
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{suggestion}</pre>
            )}
          </section>
        </>
      )}
    </main>
  );
}
