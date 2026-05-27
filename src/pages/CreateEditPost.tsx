import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostDetail, createPost, updatePost } from '../api/posts';
import FormError from '../components/FormError';
import { PlusSquare, Edit, FileImage, RotateCw, X, ImagePlus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateEditPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = !!postId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; public_id: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Error States
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [contentError, setContentError] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedPostIdRef = useRef<string | null>(null);

  // Load post coordinates if in edit mode
  useEffect(() => {
    if (!isEditMode || !postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await getPostDetail(postId);
        if (res.success && res.post) {
          const p = res.post;

          // Verify ownership
          const authorId = typeof p.author === 'object' ? p.author._id : p.author;
          if (user && authorId !== user._id) {
            setContentError('You do not have permission to edit this post.');
            navigate('/');
            return;
          }

          setTitle(p.title);
          setContent(p.content);
          // Handle both old single image and new multiple images
          const imgs = p.images || (p.image ? [p.image] : []);
          setExistingImages(imgs);
          // Store the real MongoDB ID for the update call (URL postId may be a slug)
          resolvedPostIdRef.current = p._id;
        }
      } catch (err) {
        console.error('Failed to load post.');
        setContentError('Failed to load post. Please try again later.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, isEditMode, user]);

  const handleFilesSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    let validFiles: File[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`);
        continue;
      }
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 3MB.`);
        continue;
      }
      validFiles.push(file);
    }

    const currentTotal = imageFiles.length + existingImages.length;
    if (currentTotal + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed. Extra images were discarded.');
      validFiles = validFiles.slice(0, Math.max(0, 5 - currentTotal));
    }

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreviews((p) => [...p, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(undefined);
    setContentError(undefined);

    if (title.length < 5 || title.length > 500) {
      setTitleError('Title must be between 5 and 500 characters.');
      return;
    }
    if (content.length < 5 || content.length > 5000) {
      setContentError('Content must be between 5 and 5000 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('content', content.trim());

      // Append new image files
      imageFiles.forEach((file) => {
        fd.append('images', file);
      });

      // Append existing image public_ids to keep (for edit mode)
      existingImages.forEach((img) => {
        fd.append('existingImages', img.public_id);
      });

      if (isEditMode && postId) {
        // Use the resolved MongoDB ID (not slug) for the update endpoint
        const resolvedId = resolvedPostIdRef.current || postId;
        const res = await updatePost(resolvedId, fd);
        if (res.success) {
          toast.success('Post updated successfully.');
          navigate(`/post/${resolvedId}`);
        }
      } else {
        const res = await createPost(fd);
        if (res.success && res.post) {
          toast.success('Post created successfully.');
          navigate(`/post/${res.post._id}`);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to save post.';
      setContentError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <RotateCw className="w-8 h-8 animate-spin text-orbit-accent" />
        <p className="mt-3 text-xs text-orbit-muted animate-pulse">Loading post details...</p>
      </div>
    );
  }

  const allPreviews = [...imagePreviews, ...existingImages.map((img) => img.url)];
  const totalImages = imageFiles.length + existingImages.length;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 md:px-6">
      <div className="bg-orbit-card border border-orbit-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 space-y-5 md:space-y-6 shadow-2xl relative">
        {/* Dynamic Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-orbit-border">
          <div className="w-10 h-10 rounded-full border border-orbit-accent/40 flex items-center justify-center">
            {isEditMode ? (
              <Edit className="w-5 h-5 text-orbit-accent" />
            ) : (
              <PlusSquare className="w-5 h-5 text-orbit-accent" />
            )}
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg text-white">
              {isEditMode ? 'Edit Post' : "What's on your mind?"}
            </h1>
            <p className="text-xs text-orbit-muted">
              {isEditMode
                ? 'Make changes to your post below.'
                : 'Share photos, updates, or thoughts with your followers.'}
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} className="space-y-5 text-sm" noValidate>
          {/* Post Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm"
            />
            <FormError message={titleError} />
            <span className="text-[10px] text-orbit-muted font-mono tracking-wide block">
              Title length: {title.length}/500 chars (Min 5)
            </span>
          </div>

          {/* Post Content */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here..."
              rows={8}
              className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm resize-y leading-relaxed"
            />
            <FormError message={contentError} />
            <span className="text-[10px] text-orbit-muted font-mono tracking-wide block">
              Content length: {content.length}/5000 chars (Min 5)
            </span>
          </div>

          {/* Image Upload Section - Multiple Images */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Images (Optional - Up to 5)
            </label>

            {/* Image Previews Grid */}
            {totalImages > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {imagePreviews.map((preview, i) => (
                  <div
                    key={`new-${i}`}
                    className="relative group rounded-2xl overflow-hidden border border-orbit-border aspect-square"
                  >
                    <img src={preview} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  </div>
                ))}
                {existingImages.map((img, i) => (
                  <div
                    key={`exist-${i}`}
                    className="relative group rounded-2xl overflow-hidden border border-orbit-border aspect-square"
                  >
                    <img src={img.url} alt={`Existing ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all hover:border-orbit-accent bg-black/20"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  handleFilesSelect(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
                accept="image/*"
                multiple
              />

              <div className="space-y-2">
                <ImagePlus className="w-9 h-9 text-orbit-accent mx-auto" />
                <p className="text-xs font-semibold text-white">Click to select images</p>
                <p className="text-[10px] text-orbit-muted">Supports JPEG, PNG, GIF — up to 5 images</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 sm:gap-4 pt-4 border-t border-orbit-border">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] sm:text-xs font-semibold transition-all text-orbit-muted hover:text-white cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-3 bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground font-semibold rounded-full text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {submitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save' : 'Create Post'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
