'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiFile,
  FiImage,
  FiSettings,
  FiCheck,
  FiX,
  FiEye,
  FiRefreshCw,
  FiLayout,
  FiMenu,
  FiVideo,
  FiFileText,
  FiGlobe,
  FiCalendar,
  FiHome,
  FiInfo,
  FiMail,
} from 'react-icons/fi';

interface ContentPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  type: 'page' | 'post' | 'announcement';
  author: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  featuredImage?: string;
  tags: string[];
}

interface SiteSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'html' | 'json';
  category: 'general' | 'contact' | 'social' | 'seo' | 'appearance';
}

interface MediaFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  alt?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export default function AdminContentPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pages' | 'media' | 'settings' | 'footer' | 'navigation' | 'home' | 'about' | 'contact'>('pages');
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [homeContent, setHomeContent] = useState<any>([]);
  const [aboutContent, setAboutContent] = useState<any>([]);
  const [contactContent, setContactContent] = useState<any>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [isAuthLoading, isAuthenticated, user, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let endpoint = '';
      switch (activeTab) {
        case 'pages':
          endpoint = '/api/admin/content/pages';
          break;
        case 'media':
          endpoint = '/api/admin/content/media';
          break;
        case 'settings':
          endpoint = '/api/admin/content/settings';
          break;
        case 'home':
          endpoint = '/api/admin/content/home';
          break;
        case 'about':
          endpoint = '/api/admin/content/about';
          break;
        case 'contact':
          endpoint = '/api/admin/content/contact';
          break;
        case 'footer':
          endpoint = '/api/admin/content/footer';
          break;
        case 'navigation':
          endpoint = '/api/admin/content/navigation';
          break;
      }

      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch ${activeTab}`);
      const data = await response.json();

      switch (activeTab) {
        case 'pages':
          setPages(data);
          break;
        case 'media':
          setMediaFiles(data);
          break;
        case 'settings':
          // Handle settings data
          break;
        case 'home':
          setHomeContent(data);
          break;
        case 'about':
          setAboutContent(data);
          break;
        case 'contact':
          setContactContent(data);
          break;
        case 'footer':
          // Handle footer data
          break;
        case 'navigation':
          // Handle navigation data
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let url = '';
      let method = 'POST';
      
      if (activeTab === 'pages') {
        url = isEditing ? `/api/admin/content/pages/${selectedItem.id}` : '/api/admin/content/pages';
        method = isEditing ? 'PUT' : 'POST';
      } else if (activeTab === 'home') {
        url = isEditing ? `/api/admin/content/home/${selectedItem.id}` : '/api/admin/content/home';
        method = isEditing ? 'PUT' : 'POST';
      } else if (activeTab === 'about') {
        url = isEditing ? `/api/admin/content/about/${selectedItem.id}` : '/api/admin/content/about';
        method = isEditing ? 'PUT' : 'POST';
      } else if (activeTab === 'contact') {
        url = isEditing ? `/api/admin/content/contact/${selectedItem.id}` : '/api/admin/content/contact';
        method = isEditing ? 'PUT' : 'POST';
      } else if (activeTab === 'settings') {
        url = '/api/admin/content/settings';
        method = 'PUT';
      } else if (activeTab === 'footer') {
        url = '/api/admin/content/footer';
        method = 'PUT';
      } else if (activeTab === 'navigation') {
        url = '/api/admin/content/navigation';
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(0, -1)}`);

      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)} ${isEditing ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(`Error saving ${activeTab}:`, error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(0, -1)}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      let url = '';
      if (activeTab === 'pages') {
        url = `/api/admin/content/pages/${id}`;
      } else if (activeTab === 'home') {
        url = `/api/admin/content/home/${id}`;
      } else if (activeTab === 'about') {
        url = `/api/admin/content/about/${id}`;
      } else if (activeTab === 'contact') {
        url = `/api/admin/content/contact/${id}`;
      } else if (activeTab === 'media') {
        url = `/api/admin/content/media/${id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete item');

      if (activeTab === 'home') {
        setHomeContent(homeContent.filter((item: any) => item.id !== id));
      } else if (activeTab === 'about') {
        setAboutContent(aboutContent.filter((item: any) => item.id !== id));
      } else if (activeTab === 'contact') {
        setContactContent(contactContent.filter((item: any) => item.id !== id));
      } else if (activeTab === 'media') {
        setMediaFiles(mediaFiles.filter((item: any) => item.id !== id));
      }

      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          setMediaFiles([...mediaFiles, ...result]);
          toast.success('Files uploaded successfully');
        } else {
          throw new Error('Upload failed');
        }
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        toast.error('Upload failed');
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/admin/content/media/upload');
      xhr.withCredentials = true;
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePublishToggle = async (id: number, status: string) => {
    try {
      const newStatus = status === 'published' ? 'draft' : 'published';
      const response = await fetch(`/api/admin/content/pages/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setPages(pages.map(p => 
        p.id === id ? { ...p, status: newStatus } : p
      ));

      toast.success(`Page ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({});
    setSelectedItem(null);
    setIsEditing(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setFormData({ ...item });
      setIsEditing(true);
    } else {
      resetForm();
      if (activeTab === 'pages') {
        setFormData({
          title: '',
          slug: '',
          content: '',
          excerpt: '',
          status: 'draft',
          type: 'page',
          tags: [],
        });
      }
    }
    setShowModal(true);
  };

  const getFilteredData = () => {
    let data: any[] = [];
    if (activeTab === 'pages') data = Array.isArray(pages) ? pages : [];
    else if (activeTab === 'media') data = Array.isArray(mediaFiles) ? mediaFiles : [];
    else if (activeTab === 'home') data = Array.isArray(homeContent) ? homeContent : [];
    else if (activeTab === 'about') data = Array.isArray(aboutContent) ? aboutContent : [];
    else if (activeTab === 'contact') data = Array.isArray(contactContent) ? contactContent : [];
    else if (activeTab === 'settings') data = [];
    else if (activeTab === 'footer') data = [];
    else if (activeTab === 'navigation') data = [];

    return data.filter(item =>
      Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FiImage;
    if (mimeType.startsWith('video/')) return FiVideo;
    if (mimeType.startsWith('text/')) return FiFileText;
    return FiFile;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Content Management</h1>
        <p className="text-gray-600">Manage CMS-like settings and content</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pages', label: 'Pages', icon: FiFile },
            { key: 'media', label: 'Media Library', icon: FiImage },
            { key: 'settings', label: 'Site Settings', icon: FiSettings },
            { key: 'home', label: 'Home', icon: FiHome },
            { key: 'about', label: 'About', icon: FiInfo },
            { key: 'contact', label: 'Contact', icon: FiMail },
            { key: 'footer', label: 'Footer', icon: FiLayout },
            { key: 'navigation', label: 'Navigation', icon: FiMenu },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            {activeTab === 'media' && (
              <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 cursor-pointer">
                <FiPlus className="mr-2 h-4 w-4" />
                Upload Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
            {activeTab === 'home' && (
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Add Content
          </button>
        )}
        {activeTab === 'about' && (
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Add Content
          </button>
        )}
        {activeTab === 'contact' && (
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Add Content
          </button>
        )}
          </div>
        </div>
        {isUploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Uploading files...</span>
              <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Data Display */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === 'pages' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : getFilteredData().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No pages found matching your search' : 'No pages found'}
                    </td>
                  </tr>
                ) : (
                  getFilteredData().map((page: ContentPage) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.title}</div>
                          <div className="text-sm text-gray-500">/{page.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {page.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {page.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                          {page.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {page.publishedAt ? new Date(page.publishedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handlePublishToggle(page.id, page.status)}
                            className={`${
                              page.status === 'published' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                            }`}
                            title={page.status === 'published' ? 'Unpublish' : 'Publish'}
                          >
                            {page.status === 'published' ? <FiX className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => openModal(page)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))
              ) : getFilteredData().length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No media files</h3>
                  <p className="text-gray-500 mb-4">Upload your first media file to get started</p>
                  <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 cursor-pointer">
                    <FiPlus className="mr-2 h-4 w-4" />
                    Upload Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                getFilteredData().map((file: MediaFile) => {
                  const Icon = getFileIcon(file.mimeType);
                  return (
                    <div key={file.id} className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                        {file.mimeType.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.alt || file.originalName}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                            <Icon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{file.originalName}</h3>
                        <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.size)}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              title="View"
                            >
                              <FiEye className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <FiTrash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Setting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : getFilteredData().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No settings found
                    </td>
                  </tr>
                ) : (
                  getFilteredData().map((item: any) => (
                    <tr key={item.key || item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.key || item.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {typeof item.value === 'object' 
                            ? JSON.stringify(item.value).substring(0, 50) + '...'
                            : String(item.value).length > 50 
                              ? String(item.value).substring(0, 50) + '...'
                              : String(item.value)
                          }
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category || 'general'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Setting"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Home Content</h3>
              {homeContent.length > 0 ? (
                <div className="space-y-4">
                  {homeContent.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.section_key}</h4>
                        <p className="text-sm text-gray-600">{item.content}</p>
                        <span className="text-xs text-gray-500">{item.section_type}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Content"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Content"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiHome className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No home content</h3>
                  <p className="text-gray-500 mb-4">Configure your home page content</p>
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Content
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">About Content</h3>
              {aboutContent.length > 0 ? (
                <div className="space-y-4">
                  {aboutContent.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.section_key}</h4>
                        <p className="text-sm text-gray-600">{item.content}</p>
                        <span className="text-xs text-gray-500">{item.section_type}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Content"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Content"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiInfo className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No about content</h3>
                  <p className="text-gray-500 mb-4">Configure your about page content</p>
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Content
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Contact Content</h3>
              {contactContent.length > 0 ? (
                <div className="space-y-4">
                  {contactContent.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.section_key}</h4>
                        <p className="text-sm text-gray-600">{item.content}</p>
                        <span className="text-xs text-gray-500">{item.section_type}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Content"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Content"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiMail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No contact content</h3>
                  <p className="text-gray-500 mb-4">Configure your contact page content</p>
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Content
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditing ? `Edit ${activeTab.slice(0, -1)}` : `Add ${activeTab.slice(0, -1)}`}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'pages' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={formData.slug || ''}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={formData.content || ''}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Excerpt
                      </label>
                      <textarea
                        value={formData.excerpt || ''}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={formData.status || 'draft'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type
                        </label>
                        <select
                          value={formData.type || 'page'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="page">Page</option>
                          <option value="post">Post</option>
                          <option value="announcement">Announcement</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {(activeTab === 'home' || activeTab === 'about' || activeTab === 'contact') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Key
                        </label>
                        <input
                          type="text"
                          value={formData.section_key || ''}
                          onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Type
                        </label>
                        <select
                          value={formData.section_type || ''}
                          onChange={(e) => setFormData({ ...formData, section_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          required
                        >
                          <option value="">Select type</option>
                          <option value="heading">Heading</option>
                          <option value="subheading">Subheading</option>
                          <option value="text">Text</option>
                          <option value="list_item">List Item</option>
                          <option value="image">Image</option>
                          {activeTab === 'about' && (
                            <>
                              <option value="mission">Mission</option>
                              <option value="vision">Vision</option>
                              <option value="values">Values</option>
                            </>
                          )}
                          {activeTab === 'contact' && (
                            <>
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="address">Address</option>
                              <option value="map_url">Map URL</option>
                              <option value="social_link">Social Link</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={formData.content || ''}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Order Index
                        </label>
                        <input
                          type="number"
                          value={formData.order_index || 0}
                          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_active !== false}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    {isEditing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
