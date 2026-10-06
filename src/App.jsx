import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  updateDoc,
  increment,
  arrayUnion,
} from "firebase/firestore";

import { db } from "./firebase";

const MAX_LEN = 800;
const MAX_MEDIA = 20;
const MAX_VIDEO_MB = 500;

// =========================================================
// CLOUDINARY
// =========================================================

const CLOUDINARY_CLOUD_NAME = "p1fg3tcx";
const CLOUDINARY_UPLOAD_PRESET = "hush_media";

const uploadToCloudinary = async (file) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "❌ Cloudinary upload failed:",
      errorText
    );

    throw new Error(
      "Cloudinary upload failed."
    );
  }

  const data = await response.json();

  return data;
};

// =========================================================
// ANONYMOUS IDENTITY
// =========================================================

const ADJ = [
  "quiet",
  "midnight",
  "velvet",
  "wandering",
  "sleepy",
  "electric",
  "hidden",
  "cosmic",
  "gentle",
  "restless",
  "neon",
  "curious",
];

const ANIMAL = [
  "otter",
  "owl",
  "moth",
  "heron",
  "lynx",
  "gecko",
  "panda",
  "raven",
  "koi",
  "badger",
  "bat",
  "newt",
];

const pick = (a) =>
  a[Math.floor(Math.random() * a.length)];

const makeIdentity = () => ({
  handle: `${pick(ADJ)}_${pick(ANIMAL)}${Math.floor(
    Math.random() * 900 + 100
  )}`,
  hue: Math.floor(Math.random() * 360),
});

const uid = () =>
  Math.random().toString(36).slice(2, 10);

// =========================================================
// TIME
// =========================================================

const ago = (t) => {
  const s = Math.floor(
    (Date.now() - t) / 1000
  );

  if (s < 45) return "now";

  if (s < 3600)
    return `${Math.max(
      1,
      Math.round(s / 60)
    )}m`;

  if (s < 86400)
    return `${Math.round(
      s / 3600
    )}h`;

  return `${Math.round(
    s / 86400
  )}d`;
};

// =========================================================
// NUMBER FORMAT
// =========================================================

const compact = (n) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + "M"
    : n >= 1e3
    ? (n / 1e3).toFixed(1) + "K"
    : String(n);

// =========================================================
// LOCAL STORAGE HELPERS
// =========================================================

const load = (k, d) => {
  try {
    const v = localStorage.getItem(k);

    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};

const arr = (v) =>
  Array.isArray(v) ? v : [];

// =========================================================
// NORMALIZE POSTS
// =========================================================

const normalizePosts = (list) => {
  const seen = new Set();

  return arr(list)
    .filter(
      (p) =>
        p &&
        typeof p === "object"
    )
    .map((p) => ({
      id: p.id || uid(),

      text: String(
        p.text || ""
      ),

      handle:
        p.handle ||
        "anonymous_" +
          Math.floor(
            Math.random() * 900 + 100
          ),

      hue:
        Number(p.hue) || 0,

      time:
        Number(p.time) ||
        Date.now(),

      media: arr(p.media),

      likes:
        Number(p.likes) || 0,

      replies: arr(
        p.replies
      ).map((r) => ({
        id:
          (r && r.id) ||
          uid(),

        text: String(
          (r && r.text) || ""
        ),

        handle:
          (r && r.handle) ||
          "anonymous",

        hue:
          Number(
            r && r.hue
          ) || 0,

        time:
          Number(
            r && r.time
          ) || Date.now(),
      })),

      // PINNED STATUS
      pinned: Boolean(
        p.pinned
      ),
    }))
    .filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }

      seen.add(post.id);

      return true;
    });
};

const save = (k, v) => {
  try {
    localStorage.setItem(
      k,
      JSON.stringify(v)
    );
  } catch {}
};

// =========================================================
// AVATAR
// =========================================================

function Avatar({
  hue,
  size = 44,
}) {
  const id = `av${hue}${size}`;

  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={id}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0"
            stopColor={`hsl(${hue} 90% 65%)`}
          />

          <stop
            offset="1"
            stopColor={`hsl(${
              (hue + 60) % 360
            } 90% 55%)`}
          />
        </linearGradient>
      </defs>

      <circle
        cx="20"
        cy="20"
        r="20"
        fill={`url(#${id})`}
      />

      <path
        d="M6 17c4-4 24-4 28 0-1 8-6 11-14 11S7 25 6 17z"
        fill="#0f0d24"
      />

      <ellipse
        cx="14"
        cy="19"
        rx="3.2"
        ry="2.2"
        fill={`hsl(${hue} 95% 80%)`}
      />

      <ellipse
        cx="26"
        cy="19"
        rx="3.2"
        ry="2.2"
        fill={`hsl(${hue} 95% 80%)`}
      />
    </svg>
  );
}

// =========================================================
// ICON
// =========================================================

const Icon = ({
  d,
  fill,
}) => (
  <svg
    viewBox="0 0 24 24"
    width="19"
    height="19"
    fill={
      fill
        ? "currentColor"
        : "none"
    }
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

// =========================================================
// ICON PATHS
// =========================================================

const I = {
  home:
    "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",

  search:
    "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3",

  image:
    "M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 16l-5-5-8 8",

  reply:
    "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z",

  heart:
    "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z",

  share:
    "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",

  pin:
    "M8 3h8M9 3v7l-3 4h12l-3-4V3M12 14v7",

  x:
    "M18 6L6 18M6 6l12 12",

  plus:
    "M12 5v14M5 12h14",
};

// =========================================================
// CHARACTER COUNTER
// =========================================================

function Ring({ used }) {
  const r = 9;

  const c =
    2 * Math.PI * r;

  const pct = Math.min(
    used / MAX_LEN,
    1
  );

  const left =
    MAX_LEN - used;

  const color =
    left < 0
      ? "#f0335a"
      : left < 20
      ? "#e59b00"
      : "#6d4aff";

  return (
    <span
      className="ring"
      aria-label={`${left} characters left`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth="2.5"
        />

        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={
            c * (1 - pct)
          }
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      </svg>

      {left < 20 && (
        <b style={{ color }}>
          {left}
        </b>
      )}
    </span>
  );
}

// =========================================================
// RICH TEXT
// =========================================================

function Rich({
  text,
  onTag,
}) {
  return (
    <>
      {text
        .split(/(#\w+)/g)
        .map((part, i) =>
          /^#\w+$/.test(
            part
          ) ? (
            <button
              key={i}
              className="tag"
              onClick={() =>
                onTag(part)
              }
            >
              {part}
            </button>
          ) : (
            <span key={i}>
              {part}
            </span>
          )
        )}
    </>
  );
}

// =========================================================
// MEDIA
// =========================================================

function Media({
  items,
}) {
  const [selectedImage, setSelectedImage] =
    useState(null);

  if (!items.length)
    return null;

  return (
    <>
      <div
        className={`media n${items.length}`}
      >
        {items.map(
          (m, i) => {
            const isVideo =
              m.type === "video";

            return (
              <div
                className="hush-media-item"
                key={`${m.url}-${i}`}
              >
                {isVideo ? (
                  <video
                    src={m.url}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    loading="lazy"
                    alt="Attached by an anonymous user"
                    src={m.url}
                    onClick={() =>
                      setSelectedImage(m.url)
                    }
                    style={{
                      cursor: "pointer",
                    }}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* =================================================
          FULL-SCREEN IMAGE VIEWER
          ================================================= */}

      {selectedImage && (
        <div
          className="hush-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen image viewer"
          onClick={() =>
            setSelectedImage(null)
          }
        >
          <button
            type="button"
            className="hush-image-lightbox-close"
            aria-label="Close image"
            onClick={() =>
              setSelectedImage(null)
            }
          >
            ×
          </button>

          <img
            src={selectedImage}
            alt="Full-screen view"
            className="hush-image-lightbox-image"
            onClick={(e) =>
              e.stopPropagation()
            }
          />
        </div>
      )}
    </>
  );
}
// =========================================================
// POST COMPOSER
// =========================================================

function Composer({
  onPost,
  inputRef,
  placeholder = "What's on your mind? Nobody will know it's you.",
}) {
  const [text, setText] =
    useState("");

  const [media, setMedia] =
    useState([]);

  const [error, setError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const fileRef =
    useRef(null);

  const hasVideo =
    media.some(
      (m) =>
        m.type ===
        "video"
    );

  const canPost =
    (text.trim() ||
      media.length) &&
    text.length <=
      MAX_LEN &&
    !uploading;

  const addFiles = (
    files
  ) => {
    setError("");

    let next = [
      ...media,
    ];

    for (const f of files) {
      const isVideo =
        f.type.startsWith(
          "video/"
        );

      const isImage =
        f.type.startsWith(
          "image/"
        );

      if (
        !isVideo &&
        !isImage
      ) {
        setError(
          "Only images and videos can be attached."
        );

        continue;
      }

      if (
        isVideo &&
        f.size >
          MAX_VIDEO_MB *
            1024 *
            1024
      ) {
        const fileSizeMB = (
          f.size /
          (1024 * 1024)
        ).toFixed(1);

        setError(
          `Your video is ${fileSizeMB} MB. The maximum allowed size is ${MAX_VIDEO_MB} MB.`
        );

        continue;
      }

      if (
        isVideo &&
        next.length
      ) {
        setError(
          "A video can't be combined with other media."
        );

        continue;
      }

      if (
        !isVideo &&
        next.some(
          (m) =>
            m.type ===
            "video"
        )
      ) {
        setError(
          "A video can't be combined with other media."
        );

        continue;
      }

      if (
        next.length >=
        MAX_MEDIA
      ) {
        setError(
          `You can attach up to ${MAX_MEDIA} images.`
        );

        break;
      }

      next.push({
        type: isVideo
          ? "video"
          : "image",

        url: URL.createObjectURL(
          f
        ),

        file: f,

        name: f.name,

        mimeType: f.type,
      });
    }

    setMedia(next);
  };

  const removeMedia = (
    index
  ) => {
    setMedia(
      (current) => {
        const item =
          current[index];

        if (
          item?.url?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            item.url
          );
        }

        return current.filter(
          (_, i) =>
            i !== index
        );
      }
    );
  };

  const submit = async () => {
    if (!canPost)
      return;

    setUploading(true);
    setError("");

    try {
      await onPost(
        text.trim(),
        media
      );

      media.forEach(
        (item) => {
          if (
            item?.url?.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              item.url
            );
          }
        }
      );

      setText("");
      setMedia([]);
      setError("");
    } catch (error) {
      console.error(
        "❌ Failed to publish post:",
        error
      );

      setError(
        error?.message ||
          "The post could not be published."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="composer"
      onDragOver={(e) =>
        e.preventDefault()
      }
      onDrop={(e) => {
        e.preventDefault();

        addFiles([
          ...e.dataTransfer.files,
        ]);
      }}
    >
      <div
        className="ghost-avatar"
        aria-hidden="true"
      >
        ?
      </div>

      <div className="composer-main">
        <textarea
          ref={inputRef}
          value={text}
          rows={2}
          placeholder={
            placeholder
          }
          aria-label="Write an anonymous post"
          onChange={(e) =>
            setText(
              e.target.value
            )
          }
          onKeyDown={(e) =>
            (e.metaKey ||
              e.ctrlKey) &&
            e.key ===
              "Enter" &&
            submit()
          }
        />

        {media.length >
          0 && (
          <div
            className={`media n${media.length} editable`}
          >
            {media.map(
              (m, i) => (
                <div
                  className="thumb"
                  key={m.url}
                >
                  {m.type ===
                  "video" ? (
                    <video
                      src={m.url}
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt="Attachment preview"
                    />
                  )}

                  <button
                    className="remove"
                    aria-label="Remove attachment"
                    onClick={() =>
                      removeMedia(
                        i
                      )
                    }
                    disabled={
                      uploading
                    }
                  >
                    <Icon
                      d={I.x}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}

        {uploading && (
          <p className="anon-note">
            Uploading your media
            securely...
          </p>
        )}

        <div className="composer-bar">
          <div className="tools">
            <button
              className="icon-btn"
              aria-label="Add photo or video"
              onClick={() =>
                fileRef.current.click()
              }
              disabled={
                uploading ||
                hasVideo ||
                media.length >=
                  MAX_MEDIA
              }
            >
              <Icon
                d={I.image}
              />
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles([
                  ...e.target.files,
                ]);

                e.target.value =
                  "";
              }}
            />

            <span className="anon-note">
              Posting as a new
              stranger
            </span>
          </div>

          <div className="send">
            {text.length >
              0 && (
              <Ring
                used={
                  text.length
                }
              />
            )}

            <button
              className="btn"
              disabled={
                !canPost
              }
              onClick={
                submit
              }
            >
              {uploading
                ? "Uploading..."
                : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// INDIVIDUAL POST
// =========================================================

function Post({
  post,
  liked,
  mine,
  onLike,
  onReply,
  onTag,
  onShare,
  onPin,
  pinned,
}) {
  const [open, setOpen] =
    useState(false);

  const [reply, setReply] =
    useState("");

  const send = () => {
    if (
      !reply.trim()
    )
      return;

    onReply(
      post.id,
      reply.trim()
    );

    setReply("");
  };

  return (
    <article className="post">
      <Avatar
        hue={post.hue}
      />

      <div className="post-main">
        <header>
          <strong>
            Anonymous
          </strong>

          <span className="handle">
            @{post.handle}
          </span>

          <span className="dot">
            ·
          </span>

          <span className="handle">
            {ago(
              post.time
            )}
          </span>

          {pinned && (
            <span className="handle">
              📌 Pinned
            </span>
          )}
        </header>

        {post.text && (
          <p className="text">
            <Rich
              text={post.text}
              onTag={onTag}
            />
          </p>
        )}

        <Media
          items={
            post.media
          }
        />

        <div className="actions">
          <button
            className="act"
            onClick={() =>
              setOpen(!open)
            }
            aria-label="Replies"
          >
            <Icon
              d={I.reply}
            />

            {post.replies
              .length || ""}
          </button>

          <button
            className={`act like ${
              liked
                ? "on"
                : ""
            }`}
            onClick={() =>
              onLike(
                post.id
              )
            }
            aria-pressed={
              liked
            }
            aria-label="Like"
          >
            <Icon
              d={I.heart}
              fill={liked}
            />

            {compact(
              post.likes
            )}
          </button>

          <button
            className={`act pin ${
              pinned
                ? "on"
                : ""
            }`}
            onClick={() =>
              onPin(
                post.id
              )
            }
            aria-pressed={
              pinned
            }
            aria-label={
              pinned
                ? "Unpin post"
                : "Pin post"
            }
            title={
              pinned
                ? "Unpin post"
                : "Pin post"
            }
          >
            <Icon
              d={I.pin}
              fill={pinned}
            />
          </button>

          <button
            className="act"
            onClick={() =>
              onShare(
                post.id
              )
            }
            aria-label="Copy link"
          >
            <Icon
              d={I.share}
            />
          </button>
        </div>

        {open && (
          <div className="thread">
            {post.replies.map(
              (r) => (
                <div
                  className="reply"
                  key={r.id}
                >
                  <Avatar
                    hue={r.hue}
                    size={32}
                  />

                  <div>
                    <div className="reply-head">
                      <strong>
                        Anonymous
                      </strong>

                      {" "}

                      <span className="handle">
                        @{r.handle} ·{" "}
                        {ago(
                          r.time
                        )}
                      </span>
                    </div>

                    <p>
                      {r.text}
                    </p>
                  </div>
                </div>
              )
            )}

            <div className="reply-box">
              <input
                value={reply}
                maxLength={
                  MAX_LEN
                }
                placeholder="Post your reply"
                aria-label="Write a reply"
                onChange={(e) =>
                  setReply(
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  e.key ===
                    "Enter" &&
                  send()
                }
              />

              <button
                className="btn small"
                disabled={
                  !reply.trim()
                }
                onClick={
                  send
                }
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// =========================================================
// MAIN HUSH APPLICATION
// =========================================================

function Hush() {
  const [posts, setPosts] =
    useState([]);

  const [
    loadingPosts,
    setLoadingPosts,
  ] = useState(true);

  // =========================================================
// HUSH THEME
// =========================================================

const [theme, setTheme] = useState(() => {
  const savedTheme =
    localStorage.getItem("hush2:theme");

  return savedTheme === "dark"
    ? "dark"
    : "light";
});

// Apply the selected theme.
useEffect(() => {
  document.documentElement.dataset.theme =
    theme;

  localStorage.setItem(
    "hush2:theme",
    theme
  );
}, [theme]);

// Toggle between light and dark mode.
const toggleTheme = () => {
  setTheme((currentTheme) =>
    currentTheme === "light"
      ? "dark"
      : "light"
  );
};

  // =========================================================
  // REAL-TIME FIRESTORE POSTS
  // =========================================================

  useEffect(() => {
    const postsRef =
      collection(
        db,
        "posts"
      );

    const unsubscribe =
      onSnapshot(
        postsRef,
        (snapshot) => {
          const firebasePosts =
            snapshot.docs.map(
              (document) => ({
                ...document.data(),
                id: document.id,
              })
            );

          const cleanPosts =
            normalizePosts(
              firebasePosts
            );

          setPosts(
            cleanPosts
          );

          setLoadingPosts(
            false
          );

          console.log(
            "✅ Real-time Firestore posts:",
            cleanPosts
          );
        },
        (error) => {
          console.error(
            "❌ Failed to listen to Firestore posts:",
            error
          );

          setLoadingPosts(
            false
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================================================
  // LOCAL LIKE STATE
  // =========================================================

  const [likes, setLikes] =
    useState(() =>
      arr(
        load(
          "hush2:likes",
          []
        )
      )
    );

  const [mine, setMine] =
    useState(() =>
      arr(
        load(
          "hush2:mine",
          []
        )
      )
    );

  const [view, setView] =
    useState("home");

  const [tab, setTab] =
    useState("foryou");

  const [query, setQuery] =
    useState("");

  const [, tick] =
    useState(0);

  const composerRef =
    useRef(null);

  // =========================================================
  // SAVE LOCAL USER STATE
  // =========================================================

  useEffect(
    () =>
      save(
        "hush2:likes",
        likes
      ),
    [likes]
  );

  useEffect(
    () =>
      save(
        "hush2:mine",
        mine
      ),
    [mine]
  );

  // =========================================================
  // REFRESH RELATIVE TIMES
  // =========================================================

  useEffect(() => {
    const t =
      setInterval(
        () =>
          tick(
            (n) =>
              n + 1
          ),
        30000
      );

    return () =>
      clearInterval(t);
  }, []);

  // =========================================================
  // CREATE POST
  // =========================================================

  const addPost = async (
    text,
    media
  ) => {
    const id = uid();

    const identity =
      makeIdentity();

    let uploadedMedia =
      [];

    if (
      media.length > 0
    ) {
      try {
        uploadedMedia =
          await Promise.all(
            media.map(
              async (
                item
              ) => {
                const cloudinaryData =
                  await uploadToCloudinary(
                    item.file
                  );

                return {
                  type:
                    item.type,

                  url:
                    cloudinaryData.secure_url,

                  name:
                    item.name,

                  mimeType:
                    item.mimeType,

                  publicId:
                    cloudinaryData.public_id,

                  resourceType:
                    cloudinaryData.resource_type,
                };
              }
            )
          );

        console.log(
          "✅ Media uploaded to Cloudinary:",
          uploadedMedia
        );
      } catch (error) {
        console.error(
          "❌ Cloudinary upload failed:",
          error
        );

        throw new Error(
          "Your image or video could not be uploaded."
        );
      }
    }

    const newPost = {
      id,

      text,

      media:
        uploadedMedia,

      ...identity,

      time:
        Date.now(),

      likes: 0,

      replies: [],

      pinned: false,
    };

    try {
      await setDoc(
        doc(
          db,
          "posts",
          id
        ),
        newPost
      );

      setMine(
        (currentMine) => [
          ...currentMine,
          id,
        ]
      );

      setTab("latest");

      setView("home");

      console.log(
        "✅ Hush post saved to Firestore:",
        id
      );
    } catch (error) {
      console.error(
        "❌ Failed to save Hush post:",
        error
      );

      throw error;
    }
  };

  // =========================================================
  // PIN / UNPIN
  // =========================================================

  const togglePin = async (id) => {
    const post =
      posts.find(
        (p) =>
          p.id === id
      );

    if (!post)
      return;

    const currentlyPinned =
      Boolean(post.pinned);

    try {
      if (
        currentlyPinned
      ) {
        await updateDoc(
          doc(
            db,
            "posts",
            id
          ),
          {
            pinned: false,
          }
        );

        return;
      }

      const previousPinned =
        posts.find(
          (p) =>
            p.pinned &&
            p.id !== id
        );

      if (
        previousPinned
      ) {
        await updateDoc(
          doc(
            db,
            "posts",
            previousPinned.id
          ),
          {
            pinned: false,
          }
        );
      }

      await updateDoc(
        doc(
          db,
          "posts",
          id
        ),
        {
          pinned: true,
        }
      );
    } catch (error) {
      console.error(
        "❌ Failed to update pinned post:",
        error
      );
    }
  };

  // =========================================================
  // LIKE — FIRESTORE
  // =========================================================

  const toggleLike =
    async (id) => {
      const alreadyLiked =
        likes.includes(id);

      try {
        await updateDoc(
          doc(
            db,
            "posts",
            id
          ),
          {
            likes:
              increment(
                alreadyLiked
                  ? -1
                  : 1
              ),
          }
        );

        setLikes(
          (
            currentLikes
          ) =>
            alreadyLiked
              ? currentLikes.filter(
                  (x) =>
                    x !== id
                )
              : [
                  ...currentLikes,
                  id,
                ]
        );
      } catch (error) {
        console.error(
          "❌ Error updating like:",
          error
        );
      }
    };

  // =========================================================
  // ADD REPLY — FIRESTORE
  // =========================================================

  const addReply = async (
    pid,
    text
  ) => {
    const newReply = {
      id: uid(),

      text,

      ...makeIdentity(),

      time:
        Date.now(),
    };

    try {
      await updateDoc(
        doc(
          db,
          "posts",
          pid
        ),
        {
          replies:
            arrayUnion(
              newReply
            ),
        }
      );
    } catch (error) {
      console.error(
        "❌ Error saving reply:",
        error
      );
    }
  };

  // =========================================================
  // SHARE
  // =========================================================

  const share = async (
    id
  ) => {
    const url =
      `${location.origin}${location.pathname}#${id}`;

    try {
      await navigator.clipboard.writeText(
        url
      );
    } catch (error) {
      console.error(
        "❌ Couldn't copy the link:",
        error
      );
    }
  };

  // =========================================================
  // SEARCH HASHTAG
  // =========================================================

  const goTag = (t) => {
    setQuery(t);

    setView("explore");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // START NEW POST
  // =========================================================

  const startPost = () => {
    setView("home");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(
      () =>
        composerRef.current &&
        composerRef.current.focus(),
      200
    );
  };

  // =========================================================
  // TRENDING
  // =========================================================

  const trending =
    useMemo(() => {
      const c = {};

      posts.forEach(
        (p) =>
          (
            p.text.match(
              /#\w+/g
            ) || []
          ).forEach(
            (t) =>
              (c[
                t.toLowerCase()
              ] =
                (c[
                  t.toLowerCase()
                ] || 0) + 1)
          )
      );

      return Object.entries(
        c
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 6);
    }, [posts]);

  // =========================================================
  // FILTER / SORT POSTS
  // =========================================================

  const shown =
    useMemo(() => {
      const score = (p) =>
        p.likes * 2 +
        p.replies.length *
          4;

      let list = [
        ...posts,
      ];

      if (
        view === "media"
      ) {
        list =
          list.filter(
            (p) =>
              p.media.length
          );
      }

      if (
        view ===
          "explore" &&
        query.trim()
      ) {
        list =
          list.filter(
            (p) =>
              p.text
                .toLowerCase()
                .includes(
                  query
                    .trim()
                    .toLowerCase()
                )
          );
      }

      if (
        view ===
          "explore" &&
        !query.trim()
      ) {
        list = [];
      }

      list.sort(
        (a, b) =>
          view ===
            "home" &&
          tab ===
            "latest"
            ? b.time -
              a.time
            : view ===
                "home"
            ? score(b) -
              score(a)
            : b.time -
              a.time
      );

      if (
        view === "home"
      ) {
        const pinned =
          list.find(
            (p) =>
              p.pinned
          );

        if (pinned) {
          list = [
            pinned,

            ...list.filter(
              (p) =>
                p.id !==
                pinned.id
            ),
          ];
        }
      }

      return list;
    }, [
      posts,
      view,
      tab,
      query,
    ]);

  // =========================================================
  // NAVIGATION
  // =========================================================

  const nav = [
    {
      id: "home",
      label: "Home",
      icon: I.home,
    },

    {
      id: "explore",
      label: "Explore",
      icon: I.search,
    },

    {
      id: "media",
      label: "Media",
      icon: I.image,
    },
  ];

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          hush<span>.</span>
        </div>

        <button
          className="theme-toggle"
          onClick={
            toggleTheme
          }
          aria-label={
            theme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
          title={
            theme === "light"
              ? "Dark mode"
              : "Light mode"
          }
        >
          {theme === "light"
            ? "🌙"
            : "☀️"}

          <span>
            {theme === "light"
              ? "Dark mode"
              : "Light mode"}
          </span>
        </button>

        <nav aria-label="Main">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${
                view === n.id
                  ? "on"
                  : ""
              }`}
              onClick={() =>
                setView(
                  n.id
                )
              }
            >
              <Icon
                d={n.icon}
              />

              <span>
                {n.label}
              </span>
            </button>
          ))}
        </nav>

        <button
          className="btn wide"
          onClick={
            startPost
          }
        >
          Post
        </button>

        <p className="rail-note">
          No accounts. No names.
          <br />
          Every post is a new stranger.
        </p>
      </aside>

      <main className="timeline">
        <div className="sticky-top">
          <div className="mobile-top">
            <div className="mobile-brand brand">
              hush<span>.</span>
            </div>

            <button
              className="theme-toggle mobile-theme-toggle"
              onClick={
                toggleTheme
              }
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              title={
                theme === "light"
                  ? "Dark mode"
                  : "Light mode"
              }
            >
              {theme === "light"
                ? "🌙"
                : "☀️"}
            </button>
          </div>

          {view ===
            "home" && (
            <div
              className="tabs"
              role="tablist"
            >
              <button
                role="tab"
                aria-selected={
                  tab ===
                  "foryou"
                }
                className={
                  tab ===
                  "foryou"
                    ? "on"
                    : ""
                }
                onClick={() =>
                  setTab(
                    "foryou"
                  )
                }
              >
                For you
              </button>

              <button
                role="tab"
                aria-selected={
                  tab ===
                  "latest"
                }
                className={
                  tab ===
                  "latest"
                    ? "on"
                    : ""
                }
                onClick={() =>
                  setTab(
                    "latest"
                  )
                }
              >
                Latest
              </button>
            </div>
          )}

          {view ===
            "explore" && (
            <div className="search">
              <Icon
                d={I.search}
              />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target
                      .value
                  )
                }
                placeholder="Search posts or #tags"
                aria-label="Search"
                autoFocus
              />

              {query && (
                <button
                  className="icon-btn"
                  aria-label="Clear search"
                  onClick={() =>
                    setQuery(
                      ""
                    )
                  }
                >
                  <Icon
                    d={I.x}
                  />
                </button>
              )}
            </div>
          )}

          {view ===
            "media" && (
            <h2 className="page-title">
              Photos and videos
            </h2>
          )}
        </div>

        {loadingPosts ? (
          <div className="empty">
            Loading posts...
          </div>
        ) : (
          <>
            {view ===
              "home" && (
              <Composer
                onPost={
                  addPost
                }
                inputRef={
                  composerRef
                }
              />
            )}

            {view ===
              "explore" &&
              !query.trim() && (
                <div className="trend-inline">
                  <h3>
                    Trending now
                  </h3>

                  {trending.map(
                    ([t, n]) => (
                      <button
                        key={t}
                        className="trend"
                        onClick={() =>
                          setQuery(
                            t
                          )
                        }
                      >
                        <b>
                          {t}
                        </b>

                        <span>
                          {n} post
                          {n >
                          1
                            ? "s"
                            : ""}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}

            {shown.map(
              (p) => (
                <Post
                  key={p.id}
                  post={p}
                  liked={likes.includes(
                    p.id
                  )}
                  mine={mine.includes(
                    p.id
                  )}
                  onLike={
                    toggleLike
                  }
                  onReply={
                    addReply
                  }
                  onTag={
                    goTag
                  }
                  onShare={
                    share
                  }
                  onPin={
                    togglePin
                  }
                  pinned={
                    Boolean(
                      p.pinned
                    )
                  }
                />
              )
            )}

            {shown.length ===
              0 &&
              view !==
                "explore" && (
                <div className="empty">
                  Nothing here yet.
                  Post something and stay
                  a mystery.
                </div>
              )}

            {shown.length ===
              0 &&
              view ===
                "explore" &&
              query.trim() && (
                <div className="empty">
                  No posts match
                  “{query}”.
                </div>
              )}
          </>
        )}
      </main>

      <aside className="side">
        <section className="card">
          <h3>
            House rules
          </h3>

          <p className="muted">
            Be honest, be truthful,
            don't be cruel and don't
            sound threating.
          </p>
        </section>
      </aside>

      <nav
        className="bottom"
        aria-label="Main mobile"
      >
        {nav.map((n) => (
          <button
            key={n.id}
            className={
              view === n.id
                ? "on"
                : ""
            }
            onClick={() =>
              setView(
                n.id
              )
            }
            aria-label={
              n.label
            }
          >
            <Icon
              d={n.icon}
            />
          </button>
        ))}
      </nav>

      <button
        className="fab"
        onClick={
          startPost
        }
        aria-label="New post"
      >
        <Icon
          d={I.plus}
        />
      </button>
    </div>
  );
}

// =========================================================
// ERROR BOUNDARY
// =========================================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(
    error
  ) {
    return {
      error,
    };
  }

  render() {
    if (
      !this.state
        .error
    ) {
      return this.props
        .children;
    }

    return (
      <div
        style={{
          padding: 24,
          fontFamily:
            "system-ui",
          maxWidth: 560,
          margin:
            "40px auto",
        }}
      >
        <h2>
          Something went wrong
        </h2>

        <p>
          {String(
            this.state
              .error &&
              this.state
                .error.message
          )}
        </p>

        <button
          onClick={() => {
            try {
              Object.keys(
                localStorage
              )
                .filter(
                  (k) =>
                    k.startsWith(
                      "hush"
                    )
                )
                .forEach(
                  (k) =>
                    localStorage.removeItem(
                      k
                    )
                );
            } catch {}

            location.reload();
          }}
          style={{
            padding:
              "10px 18px",
            borderRadius: 999,
            border: 0,
            background:
              "#6d4aff",
            color: "#fff",
            fontWeight: 600,
            cursor:
              "pointer",
          }}
        >
          Reset and reload
        </button>
      </div>
    );
  }
}

// =========================================================
// ROOT COMPONENT
// =========================================================

export default function App() {
  return (
    <ErrorBoundary>
      <Hush />
    </ErrorBoundary>
  );
}