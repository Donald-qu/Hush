
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
  } from "firebase/firestore";
import { auth, db } from "./firebase";

export default function AdminDashboard({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // Listen for changes to the existing Hush posts collection.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "posts"),

      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((document) => ({
          ...document.data(),
          firestoreId: document.id,
        }));

        setPosts(fetchedPosts);
        setError("");
        setLoading(false);
      },

      (firebaseError) => {
        console.error("Dashboard Firestore error:", firebaseError);
        setError(
          "Unable to load posts. Check your Firestore permissions and connection."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculate dashboard statistics from real Firestore data.
  const reportedPosts = posts
    .filter((post) => Number(post.reports || 0) > 0)
    .sort((a, b) => {
      const reportDifference =
        Number(b.reports || 0) - Number(a.reports || 0);

      return reportDifference || Number(b.time || 0) - Number(a.time || 0);
    });

  const totalReports = posts.reduce(
    (total, post) => total + Number(post.reports || 0),
    0
  );

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error("Admin logout failed:", logoutError);
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  };
  
const handleDeletePost = async (post) => {
    if (deletingId !== null) return;
  
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this post?\n\n` +
      `Posted by: @${post.handle || "anonymous"}\n` +
      `Reports: ${post.reports || 0}\n\n` +
      `This action cannot be undone.`
    );
  
    if (!confirmed) return;
  
    setDeletingId(post.firestoreId);
    setError("");
  
    try {
      await deleteDoc(doc(db, "posts", post.firestoreId));
  
      console.log("Administrator deleted post:", post.firestoreId);
    } catch (deleteError) {
      console.error("Failed to delete post:", deleteError);
  
      setError(
        "Unable to delete this post. Please verify your administrator permissions."
      );
    } finally {
      setDeletingId(null);
    }
  };
  
  return (
    <div className="hush-dashboard">
      <aside className="hush-dashboard-sidebar">
        <div className="hush-dashboard-brand">
          hush<span>.</span>
          <small>ADMINISTRATION</small>
        </div>

        <nav className="hush-dashboard-nav">
          <a className="active" href="#overview">
            Overview
          </a>

          <a href="#reports">
            Reported Posts
          </a>

          <a href="/" target="_blank" rel="noreferrer">
            View Hush ↗
          </a>
        </nav>

        <div className="hush-dashboard-sidebar-bottom">
          <span>Administrator</span>
          <small>{user.email}</small>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="hush-dashboard-main" id="overview">
        <header className="hush-dashboard-header">
          <div>
            <span className="hush-dashboard-eyebrow">
              HUSH CONTROL CENTER
            </span>

            <h1>Dashboard</h1>

            <p>
              Manage your community and review reported content.
            </p>
          </div>

          <div className="hush-dashboard-admin-badge">
            Administrator
          </div>
        </header>

        {error && (
          <p role="alert" style={{ color: "#dc3545", marginBottom: 20 }}>
            {error}
          </p>
        )}

        <section className="hush-dashboard-stats">
          <article className="hush-dashboard-stat">
            <span>Total Posts</span>
            <strong>{loading ? "—" : posts.length}</strong>
            <small>Posts currently stored in Firestore</small>
          </article>

          <article className="hush-dashboard-stat">
            <span>Reported Posts</span>
            <strong>{loading ? "—" : reportedPosts.length}</strong>
            <small>Posts flagged by the community</small>
          </article>

          <article className="hush-dashboard-stat">
            <span>Total Reports</span>
            <strong>{loading ? "—" : totalReports}</strong>
            <small>Combined report count</small>
          </article>
        </section>

        <section className="hush-dashboard-reports" id="reports">
          <div className="hush-dashboard-section-heading">
            <div>
              <h2>Reported Posts</h2>
              <p>Review content flagged by the Hush community.</p>
            </div>

            <span>
              {loading ? "Loading..." : `${reportedPosts.length} flagged`}
            </span>
          </div>

          {loading ? (
            <div className="hush-dashboard-empty">
              <h3>Loading reported posts...</h3>
              <p>Retrieving information from Firebase Firestore.</p>
            </div>
          ) : reportedPosts.length === 0 ? (
            <div className="hush-dashboard-empty">
              <div className="hush-dashboard-empty-icon">✓</div>
              <h3>No reported posts</h3>
              <p>
                There are currently no posts with recorded reports.
              </p>
            </div>
          ) : (
            <div className="hush-admin-post-list">
              {reportedPosts.map((post) => (
                <article
                  className="hush-admin-post"
                  key={post.firestoreId}
                >
                  <div className="hush-admin-post-top">
                    <div>
                      <strong>@{post.handle || "anonymous"}</strong>
                      <small>
                        {post.time
                          ? new Date(Number(post.time)).toLocaleString()
                          : "Date unavailable"}
                      </small>
                    </div>

                    <span className="hush-admin-report-count">
                      {post.reports}{" "}
                      {Number(post.reports) === 1 ? "report" : "reports"}
                    </span>
                  </div>

                  {post.text && (
                    <p className="hush-admin-post-text">
                      {post.text}
                    </p>
                  )}

                  {Array.isArray(post.media) &&
                    post.media.map((item, index) => {
                      if (!item?.url) return null;

                      return (
                        <div
                          className="hush-admin-post-media"
                          key={`${post.firestoreId}-${index}`}
                        >
                          {item.type === "video" ||
                          item.resourceType === "video" ? (
                            <video
                              src={item.url}
                              controls
                              playsInline
                              preload="metadata"
                            />
                          ) : item.type === "image" ||
                            item.resourceType === "image" ? (
                            <img
                              src={item.url}
                              alt="Reported post attachment"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                      );
                    })}

                  
<div className="hush-admin-post-footer">
  <span>Post ID: {post.firestoreId}</span>

  <button
    type="button"
    className="hush-admin-delete-btn"
    onClick={() => handleDeletePost(post)}
    disabled={deletingId !== null}
  >
    {deletingId === post.firestoreId
      ? "Deleting..."
      : "Delete Post"}
  </button>
</div>

                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
