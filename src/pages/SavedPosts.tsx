import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSavedPosts, getFolders, createFolder, deleteFolder, updateFolder } from '../api/saves';
import { Post, SaveFolder } from '../types/api';
import PostCard from '../components/PostCard';
import { toast } from 'sonner';
import { SkeletonFeed } from '../components/Skeleton';
import { useSocket } from '../context/SocketContext';
import { Bookmark, RotateCw, FolderPlus, Folder, X, Check, Edit3, Trash2, List, Grid3X3 } from 'lucide-react';

export default function SavedPosts() {
  const queryClient = useQueryClient();
  const { onPostSave, onPostUnsave } = useSocket();
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Folders query
  const { data: foldersData } = useQuery({
    queryKey: ['saveFolders'],
    queryFn: async () => {
      const res = await getFolders();
      return res;
    },
  });

  const folders: SaveFolder[] = foldersData?.folders || [];

  // Saved Posts query
  const {
    data,
    isLoading: loading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['savedPosts', selectedFolder],
    queryFn: async ({ pageParam }) => {
      const res = await getSavedPosts(10, pageParam, selectedFolder);
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  const posts =
    data?.pages
      .flatMap((page) => page.posts || page.items || page.saves || [])
      .filter((p: Post) => p.savedByMe !== false) || [];

  // Subscribe to socket events for real-time updates
  useEffect(() => {
    const unsubSave = onPostSave(() => {
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
    });
    const unsubUnsave = onPostUnsave(() => {
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
    });
    return () => {
      unsubSave();
      unsubUnsave();
    };
  }, [onPostSave, onPostUnsave, queryClient]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await createFolder(newFolderName.trim());
      if (res.success) {
        toast.success('Folder created!');
        setNewFolderName('');
        setIsCreatingFolder(false);
        queryClient.invalidateQueries({ queryKey: ['saveFolders'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create folder.');
    }
  };

  const handleDeleteFolder = async (folderId: string, name: string) => {
    try {
      const res = await deleteFolder(folderId);
      if (res.success) {
        toast.success(`Folder "${name}" deleted.`);
        if (selectedFolder === folderId) setSelectedFolder(undefined);
        queryClient.invalidateQueries({ queryKey: ['saveFolders'] });
        queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete folder.');
    }
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    try {
      const res = await updateFolder(folderId, editingFolderName.trim());
      if (res.success) {
        toast.success('Folder renamed!');
        setEditingFolderId(null);
        queryClient.invalidateQueries({ queryKey: ['saveFolders'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename folder.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="border-b border-orbit-border pb-4 space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-semibold text-2xl text-white flex items-center gap-2">
            <Bookmark className="w-5.5 h-5.5 text-orbit-accent fill-orbit-accent/10" />
            <span>Saved Posts</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-orbit-muted hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
              title={viewMode === 'grid' ? 'List view' : 'Grid view'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-orbit-muted">Organize your bookmarked posts into folders.</p>
      </div>

      {/* Folders Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {' '}
        <button
          onClick={() => setSelectedFolder(undefined)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            !selectedFolder
              ? 'bg-orbit-accent text-orbit-accent-foreground'
              : 'bg-white/5 text-orbit-muted hover:text-white border border-orbit-border/40'
          }`}
        >
          <span className="flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            All
          </span>
        </button>
        {folders.map((folder) => (
          <div key={folder._id} className="relative group shrink-0">
            {editingFolderId === folder._id ? (
              <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1 border border-orbit-accent">
                <input
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  className="w-20 bg-transparent text-[10px] text-white outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateFolder(folder._id);
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdateFolder(folder._id)}
                  className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedFolder(folder._id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  selectedFolder === folder._id
                    ? 'bg-orbit-accent text-orbit-accent-foreground'
                    : 'bg-white/5 text-orbit-muted hover:text-white border border-orbit-border/40'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {folder.name}
                </span>
              </button>
            )}
            {/* Folder actions on hover */}
            {!editingFolderId && (
              <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(folder._id);
                    setEditingFolderName(folder.name);
                  }}
                  className="p-0.5 bg-orbit-card border border-orbit-border rounded text-orbit-muted hover:text-white cursor-pointer"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder._id, folder.name);
                  }}
                  className="p-0.5 bg-orbit-card border border-orbit-border rounded text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {/* Create Folder Button */}
        {isCreatingFolder ? (
          <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1 border border-orbit-accent">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-24 bg-transparent text-[10px] text-white outline-none placeholder:text-orbit-muted"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
            />
            <button onClick={handleCreateFolder} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer bg-white/5 text-orbit-muted hover:text-white border border-dashed border-orbit-border/40 shrink-0 whitespace-nowrap"
          >
            <span className="flex items-center gap-1">
              <FolderPlus className="w-3 h-3" />
              New Folder
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div role="status" aria-label="Loading saved posts">
          <SkeletonFeed count={3} />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-black/20 border border-orbit-border flex items-center justify-center mx-auto text-orbit-accent">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="font-display font-medium text-white text-sm">No saved posts</h3>
          <p className="text-xs text-orbit-muted max-w-sm mx-auto">
            {selectedFolder
              ? 'No posts in this folder yet. Save posts to this folder from the feed.'
              : "You haven't bookmarked any posts yet. Click the bookmark icon on any post to save it here."}
          </p>
          <Link
            to="/"
            className="inline-block bg-white/5 hover:bg-orbit-accent hover:text-orbit-accent-foreground text-xs font-semibold px-4 py-2 rounded-full mt-4 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            Go to Feed
          </Link>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-5'}>
          {posts.map((post: Post) => (
            <PostCard
              key={post._id}
              post={post}
              onDelete={() => {
                queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
              }}
            />
          ))}

          {hasNextPage && (
            <div className="pt-4 text-center col-span-full">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-orbit-card hover:bg-white/5 border border-orbit-border rounded-full px-6 py-2.5 text-xs text-orbit-muted hover:text-white transition-all font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                {isFetchingNextPage ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
