'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiBriefcase, FiBook, FiAward, FiCreditCard, FiFileText } from 'react-icons/fi';
type ProfileData = {
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    placeOfBirth: string;
    profilePicture?: string | null;
    nationality: string;
    idNumber: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
  };
  professionalInfo: {
    occupation: string;
    company: string;
    industry: string;
    yearsOfExperience: string;
    specialization: string;
    skills: string[];
  };
  education: {
    additionalCertifications: string | number | readonly string[] | undefined;
    highestDegree: string;
    institution: string;
    yearOfGraduation: string;
  }[];
  membership: {
    areasOfInterest: string | number | readonly string[] | undefined;
    membershipType: string;
    membershipNumber: string;
    membershipStatus: string;
    joinDate: string;
  };
  payment: {
    accountNumber: string;
    bankName: string;
    paymentMethod: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    mobileProvider?: string;
    mobileNumber?: string;
    paymentReference?: string;
  };
  participation: {
    previousEvents: string[];
    areasOfInterest: string[];
    volunteerInterest: boolean;
  };
  documents: {
    idProof: File | null;
    degreeCertificates: File[];
    cv: File | null;
  };
};

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw white background for transparent images
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      // Draw the resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};
export default function CompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [educationCount, setEducationCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [formattedMembershipNumber, setFormattedMembershipNumber] = useState('');
  const [formData, setFormData] = useState<ProfileData>({
    personalInfo: {
      fullName: user?.name || '',
      dateOfBirth: '',
      gender: '',
      placeOfBirth: '',
      profilePicture: null,
      nationality: 'Tanzanian',
      idNumber: ''
    },
    contactInfo: {
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      country: '',
      postalCode: ''
    },
    professionalInfo: {
      occupation: '',
      company: '',
      industry: '',
      yearsOfExperience: '',
      specialization: '',
      skills: []
    },
    education: [{
      highestDegree: '',
      institution: '',
      yearOfGraduation: '',
      additionalCertifications: ''
    }],
    membership: {
      membershipType: 'regular',
      membershipNumber: '',
      membershipStatus: 'pending',
      joinDate: new Date().toISOString().split('T')[0],
      areasOfInterest: ''
    },
    payment: {
      paymentMethod: 'mobile_money',
      accountNumber: '',
      bankName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: ''
    },
    participation: {
      previousEvents: [],
      areasOfInterest: [],
      volunteerInterest: false
    },
    documents: {
      idProof: null,
      degreeCertificates: [],
      cv: null
    }
  });
  const fetchProfile = useCallback(async () => {
  try {
    setIsLoading(true);

    const response = await fetch('/api/auth/profile', { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const data = await response.json();
    console.log('Profile API response:', data);
    
    if (data.success && data.user) {
      const userData = data.user;
      const profile = userData.profile || {};
      const membershipNumber = userData.membershipNumber || profile.membership?.membershipNumber || '';
      setFormattedMembershipNumber(membershipNumber);
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          fullName: profile.personalInfo?.fullName || userData.name || '',
          gender: profile.personalInfo?.gender || '',
          dateOfBirth: profile.personalInfo?.dateOfBirth || '',
          idNumber: profile.personalInfo?.idNumber || '',
          profilePicture: profile.personalInfo?.profilePicture || null,
          nationality: profile.personalInfo?.nationality || 'Tanzanian',
          placeOfBirth: profile.personalInfo?.placeOfBirth || '',
        },
        contactInfo: {
          ...prev.contactInfo,
          email: profile.contactInfo?.email || userData.email || '',
          phone: profile.contactInfo?.phone || '',
          address: profile.contactInfo?.address || '',
          city: profile.contactInfo?.city || 'Dar es Salaam',
          country: profile.contactInfo?.country || 'Tanzania',
          postalCode: profile.contactInfo?.postalCode || ''
        },
        professionalInfo: {
          ...prev.professionalInfo,
          ...(profile.professionalInfo || {})
        },
        education: Array.isArray(profile.education) && profile.education.length > 0 ? profile.education : prev.education,
        membership: {
          ...prev.membership,
          ...(profile.membership || {}),
          membershipNumber
        },
        payment: {
          ...prev.payment,
          ...(profile.payment || {})
        },
        participation: {
          ...prev.participation,
          ...(profile.participation || {})
        }
      }));
    }
  } catch (error: unknown) {
  console.error('Error fetching profile:', error);
  toast.error('Failed to load profile data');
  if (error instanceof Error && 
      (error.message === 'No authentication token found' || 
       error.message.includes('401'))) {
    router.push('/auth/login');
  }
} finally {
    setIsLoading(false);
  }
}, [router]);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]
  );



  const validateAndProcessImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        reject(new Error('Only JPG and PNG files are allowed'));
        return;
      }

      // Check file size (2MB max)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        reject(new Error('File size must be less than 2MB'));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(url);
        
        // Check minimum dimensions
        const minDimension = 400;
        if (img.width < minDimension || img.height < minDimension) {
          reject(new Error(`Image must be at least ${minDimension}x${minDimension} pixels`));
          return;
        }

        // Calculate dimensions for square crop
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Create canvas for cropping and resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to process image'));
          return;
        }

        // Set canvas size to 600x600 (optimal for membership card)
        const outputSize = 600;
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Draw the cropped and resized image
        ctx.drawImage(
          img, 
          x, y,           // Source x, y (crop start)
          size, size,     // Source width, height (crop size)
          0, 0,           // Destination x, y
          outputSize, outputSize // Destination width, height
        );

        // Convert to base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.9);
        resolve(base64Image);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => {
      if (section === 'documents') {
        return {
          ...prev,
          documents: {
            ...prev.documents,
            [field]: value
          }
        };
      } else if (section === 'personalInfo') {
        return {
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            [field]: value
          }
        };
      } else if (section === 'contactInfo') {
        return {
          ...prev,
          contactInfo: {
            ...prev.contactInfo,
            [field]: value
          }
        };
      } else if (section === 'professionalInfo') {
        return {
          ...prev,
          professionalInfo: {
            ...prev.professionalInfo,
            [field]: value
          }
        };
      } else if (section === 'education') {
        return {
          ...prev,
          education: value
        };
      } else if (section === 'membership') {
        return {
          ...prev,
          membership: {
            ...prev.membership,
            [field]: value
          }
        };
      } else if (section === 'payment') {
        return {
          ...prev,
          payment: {
            ...prev.payment,
            [field]: value
          }
        };
      } else if (section === 'participation') {
        return {
          ...prev,
          participation: {
            ...prev.participation,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  // ... [rest of your existing code for handleAddEducation, handleRemoveEducation, etc.]
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add all form data to FormData
      formDataToSend.append('personalInfo', JSON.stringify({
        fullName: formData.personalInfo.fullName,
        name: formData.personalInfo.fullName,
        gender: formData.personalInfo.gender,
        date_of_birth: formData.personalInfo.dateOfBirth,
        id_number: formData.personalInfo.idNumber,
        nationality: formData.personalInfo.nationality,
        place_of_birth: formData.personalInfo.placeOfBirth,
      }));

      formDataToSend.append('contactInfo', JSON.stringify({
        email: formData.contactInfo.email,
        phone: formData.contactInfo.phone,
        address: formData.contactInfo.address,
        city: formData.contactInfo.city,
        country: formData.contactInfo.country,
        postalCode: formData.contactInfo.postalCode
      }));

      formDataToSend.append('professionalInfo', JSON.stringify(formData.professionalInfo));
      formDataToSend.append('education', JSON.stringify(formData.education));
      formDataToSend.append('membership', JSON.stringify(formData.membership));
      formDataToSend.append('payment', JSON.stringify(formData.payment));
      formDataToSend.append('participation', JSON.stringify(formData.participation));

      // Handle profile picture upload
      if (formData.personalInfo.profilePicture) {
        // Type guard to check if profilePicture is a File
        const isFile = (obj: any): obj is File => {
          return obj instanceof File || 
                 (typeof obj === 'object' && 
                  obj !== null && 
                  typeof obj.name === 'string' && 
                  typeof obj.size === 'number' && 
                  typeof obj.type === 'string');
        };
        
        if (isFile(formData.personalInfo.profilePicture)) {
          formDataToSend.append('profilePicture', formData.personalInfo.profilePicture);
        } else if (typeof formData.personalInfo.profilePicture === 'string') {
          // If it's a base64 string or URL
          formDataToSend.append('profilePictureUrl', formData.personalInfo.profilePicture);
        }
      }

      if (formData.documents.idProof) {
        formDataToSend.append('idProof', formData.documents.idProof);
      }

      if (Array.isArray(formData.documents.degreeCertificates) && formData.documents.degreeCertificates.length > 0) {
        for (const cert of formData.documents.degreeCertificates) {
          formDataToSend.append('degreeCertificates', cert);
        }
      }

      if (formData.documents.cv) {
        formDataToSend.append('cv', formData.documents.cv);
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Profile update error:', result);
        throw new Error(result.message || result.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      await fetchProfile(); // Refresh the profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Personal Information</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Update your personal information here.</p>
            </div>

            {/* Profile Picture Upload */}
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Profile Picture</label>
                <div className="mt-2 flex items-start">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-950">
                      {formData.personalInfo.profilePicture ? (
                        <img
                          src={formData.personalInfo.profilePicture}
                          alt="Profile Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                          <FiUser className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                    {formData.personalInfo.profilePicture && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('personalInfo', 'profilePicture', null)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 focus:outline-none"
                        title="Remove photo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="ml-5">
                    <label className="relative cursor-pointer bg-white dark:bg-gray-900 py-2 px-3 border border-gray-300 dark:border-white/15 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <span>{formData.personalInfo.profilePicture ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg, image/png"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const processedImage = await validateAndProcessImage(file);
                              handleInputChange('personalInfo', 'profilePicture', processedImage);
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : 'Failed to process image');
                            }
                          }
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      JPG or PNG (Min. 400×400px, Max. 2MB)
                    </p>
                    {formData.personalInfo.profilePicture && (
                      <p className="mt-1 text-xs text-emerald-600">
                        ✓ Photo meets requirements
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="sm:col-span-6">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.personalInfo.fullName}
                    onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Member's legal name (First, Middle, Last)</p>
              </div>

              {/* Gender */}
              <div className="sm:col-span-3">
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-white/15 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={formData.personalInfo.gender}
                  onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Gender identity</p>
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-3">
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Date of Birth
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Used for demographics or age-based services</p>
              </div>

              {/* Place of Birth */}
              <div className="sm:col-span-6">
                <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Place of Birth
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="placeOfBirth"
                    name="placeOfBirth"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.personalInfo.placeOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'placeOfBirth', e.target.value)}
                    list="tanzaniaRegions"
                  />
                  <datalist id="tanzaniaRegions">
                    <option value="Arusha" />
                    <option value="Dar es Salaam" />
                    <option value="Dodoma" />
                    <option value="Geita" />
                    <option value="Iringa" />
                    <option value="Kagera" />
                    <option value="Katavi" />
                    <option value="Kigoma" />
                    <option value="Kilimanjaro" />
                    <option value="Lindi" />
                    <option value="Manyara" />
                    <option value="Mara" />
                    <option value="Mbeya" />
                    <option value="Morogoro" />
                    <option value="Mtwara" />
                    <option value="Mwanza" />
                    <option value="Njombe" />
                    <option value="Pemba North" />
                    <option value="Pemba South" />
                    <option value="Pwani" />
                    <option value="Rukwa" />
                    <option value="Ruvuma" />
                    <option value="Shinyanga" />
                    <option value="Simiyu" />
                    <option value="Singida" />
                    <option value="Songwe" />
                    <option value="Tabora" />
                    <option value="Tanga" />
                    <option value="Zanzibar North" />
                    <option value="Zanzibar South and Central" />
                    <option value="Zanzibar West" />
                  </datalist>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Regions of Tanzania</p>
              </div>
            </div>
          </div>
        );
      // Add other sections (contact, professional, etc.)
      case 'contact':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Contact Information</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Update your contact details.</p>
            </div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Email */}
              <div className="sm:col-span-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo?.email || ''}
                    onChange={(e) => handleInputChange('contactInfo', 'email', e.target.value)}
                    disabled={!formData.contactInfo}
                  />
                </div>
              </div>
              {/* Phone */}
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo.phone}
                    onChange={(e) => handleInputChange('contactInfo', 'phone', e.target.value)}
                  />
                </div>
              </div>
              {/* Address */}
              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Street Address
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo.address}
                    onChange={(e) => handleInputChange('contactInfo', 'address', e.target.value)}
                  />
                </div>
              </div>
              {/* City */}
              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  City
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="city"
                    name="city"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo.city}
                    onChange={(e) => handleInputChange('contactInfo', 'city', e.target.value)}
                  />
                </div>
              </div>
              {/* Country */}
              <div className="sm:col-span-2">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Country
                </label>
                <div className="mt-1">
                  <select
                    id="country"
                    name="country"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo.country}
                    onChange={(e) => handleInputChange('contactInfo', 'country', e.target.value)}
                  >
                    <option value="Tanzania">Tanzania</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    {/* Add more countries as needed */}
                  </select>
                </div>
              </div>
              {/* Postal Code */}
              <div className="sm:col-span-2">
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Postal Code
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.contactInfo.postalCode}
                    onChange={(e) => handleInputChange('contactInfo', 'postalCode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'professional':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Professional Information</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Tell us about your professional background.</p>
            </div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Current Position */}
              <div className="sm:col-span-3">
                <label htmlFor="currentPosition" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Current Position
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="currentPosition"
                    name="currentPosition"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.professionalInfo.occupation}
onChange={(e) => handleInputChange('professionalInfo', 'occupation', e.target.value)}
                  />
                </div>
              </div>
              {/* Company */}
              <div className="sm:col-span-3">
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Company
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.professionalInfo.company}
                    onChange={(e) => handleInputChange('professionalInfo', 'company', e.target.value)}
                  />
                </div>
              </div>
              {/* Industry */}
              <div className="sm:col-span-3">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Industry
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="industry"
                    name="industry"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.professionalInfo.industry}
                    onChange={(e) => handleInputChange('professionalInfo', 'industry', e.target.value)}
                  />
                </div>
              </div>
              {/* Years of Experience */}
              <div className="sm:col-span-3">
                <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Years of Experience
                </label>
                <div className="mt-1">
                  <select
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.professionalInfo.yearsOfExperience}
                    onChange={(e) => handleInputChange('professionalInfo', 'yearsOfExperience', e.target.value)}
                  >
                    <option value="">Select years</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>
              {/* Skills */}
              <div className="sm:col-span-6">
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Skills
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="skills"
                    name="skills"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.professionalInfo.skills ? formData.professionalInfo.skills.join(', ') : ''}
                    onChange={(e) => handleInputChange(
                      'professionalInfo',
                      'skills',
                      e.target.value.split(',').map(skill => skill.trim()).filter(Boolean)
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Separate skills with commas</p>
              </div>
              {/* Previous Positions */}
              <div className="sm:col-span-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Previous Positions</h4>
                {/* Add dynamic form for previous positions */}
              </div>
            </div>
          </div>
        );
      case 'education':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Education Background</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Add your educational qualifications.</p>
            </div>
            {formData.education.map((edu, index) => (
              <div key={index} className="space-y-4 border border-gray-200 dark:border-white/10 p-4 rounded-lg">
                {/* Highest Degree */}
                <div className="sm:col-span-3">
                  <label htmlFor={`highestDegree-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Highest Degree Achieved
                  </label>
                  <div className="mt-1">
                    <select
                      id={`highestDegree-${index}`}
                      name={`highestDegree-${index}`}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                      value={edu.highestDegree}
                      onChange={(e) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...newEducation[index], highestDegree: e.target.value };
                        handleInputChange('education', 'education', newEducation);
                      }}
                    >
                      <option value="">Select highest degree</option>
                      <option value="phd">PhD</option>
                      <option value="masters">Master's Degree</option>
                      <option value="bachelors">Bachelor's Degree</option>
                      <option value="diploma">Diploma</option>
                      <option value="certificate">Certificate</option>
                    </select>
                  </div>
                </div>
                {/* Institution */}
                <div className="sm:col-span-3">
                  <label htmlFor={`institution-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Institution
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id={`institution-${index}`}
                      name={`institution-${index}`}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                      value={edu.institution}
                      onChange={(e) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...newEducation[index], institution: e.target.value };
                        handleInputChange('education', 'education', newEducation);
                      }}
                    />
                  </div>
                </div>
                {/* Year of Graduation */}
                <div className="sm:col-span-3">
                  <label htmlFor={`yearOfGraduation-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Year of Graduation
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id={`yearOfGraduation-${index}`}
                      name={`yearOfGraduation-${index}`}
                      min="1900"
                      max={new Date().getFullYear()}
                      className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                      value={edu.yearOfGraduation}
                      onChange={(e) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...newEducation[index], yearOfGraduation: e.target.value };
                        handleInputChange('education', 'education', newEducation);
                      }}
                    />
                  </div>
                </div>
                {/* Additional Certifications */}
                <div className="sm:col-span-6">
                  <label htmlFor={`additionalCertifications-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Additional Certifications
                  </label>
                  <div className="mt-1">
                    <textarea
                      id={`additionalCertifications-${index}`}
                      name={`additionalCertifications-${index}`}
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                      value={edu.additionalCertifications}
                      onChange={(e) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...newEducation[index], additionalCertifications: e.target.value };
                        handleInputChange('education', 'education', newEducation);
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">List any additional certifications or training</p>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-emerald-700 dark:text-emerald-300 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => {
                  const newEducation = [
                    ...formData.education,
                    {
                      highestDegree: '',
                      institution: '',
                      yearOfGraduation: '',
                      additionalCertifications: ''
                    }
                  ];
                  handleInputChange('education', 'education', newEducation);
                }}
              >
                + Add Another Education
              </button>
            </div>
          </div>
        );
      case 'membership':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Membership Details</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Your membership information and status.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Membership Type */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Membership Type</label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          className="bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 block w-full sm:text-sm rounded-md p-2"
                          value={formData.membership.membershipType || 'Standard'}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Membership Number */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Membership Number</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="flex">
                        <input
                          type="text"
                          className="bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 block w-full sm:text-sm rounded-l-md p-2"
                          value={formattedMembershipNumber}
                          readOnly
                        />
                        {formattedMembershipNumber && formattedMembershipNumber !== 'MEM2500001' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formattedMembershipNumber);
                              toast.success('Membership number copied to clipboard');
                            }}
                            className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-white/15 bg-gray-50 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-gray-950"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Membership Status */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Membership Status</label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          className="bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 block w-full sm:text-sm rounded-md p-2"
                          value={formData.membership.membershipStatus || 'Pending Approval'}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Join Date */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Join Date</label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          className="bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 block w-full sm:text-sm rounded-md p-2"
                          value={formData.membership.joinDate ? new Date(formData.membership.joinDate).toLocaleDateString() : 'N/A'}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Areas of Interest */}
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Areas of Interest</label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/15 rounded-md p-3 min-h-12">
                          {formData.participation.areasOfInterest && formData.participation.areasOfInterest.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(formData.participation.areasOfInterest) ? (
                                formData.participation.areasOfInterest.map((interest, index) => (
                                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {interest}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {formData.participation.areasOfInterest}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">No areas of interest selected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Payment Information</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Your payment details for membership fees.</p>
            </div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Payment Method */}
              <div className="sm:col-span-6">
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Payment Method
                </label>
                <div className="mt-1">
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                    value={formData.payment.paymentMethod}
                    onChange={(e) => handleInputChange('payment', 'paymentMethod', e.target.value)}
                  >
                    <option value="credit_card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              {/* Conditional fields based on payment method */}
              {formData.payment.paymentMethod === 'credit_card' && (
                <>
                  <div className="sm:col-span-6">
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Card Number
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.cardNumber || ''}
                        onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Expiry Date
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="expiryDate"
                        name="expiryDate"
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.expiryDate || ''}
                        onChange={(e) => handleInputChange('payment', 'expiryDate', e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      CVV
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.cvv || ''}
                        onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </>
              )}
              {formData.payment.paymentMethod === 'bank_transfer' && (
                <>
                  <div className="sm:col-span-6">
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Bank Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="bankName"
                        name="bankName"
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.bankName || ''}
                        onChange={(e) => handleInputChange('payment', 'bankName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Account Number
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="accountNumber"
                        name="accountNumber"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.accountNumber || ''}
                        onChange={(e) => handleInputChange('payment', 'accountNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
              {formData.payment.paymentMethod === 'mobile_money' && (
                <>
                  <div className="sm:col-span-3">
                    <label htmlFor="mobileProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Mobile Provider
                    </label>
                    <div className="mt-1">
                      <select
                        id="mobileProvider"
                        name="mobileProvider"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.mobileProvider || ''}
                        onChange={(e) => handleInputChange('payment', 'mobileProvider', e.target.value)}
                      >
                        <option value="">Select provider</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="tigopesa">Tigo Pesa</option>
                        <option value="airtelmoney">Airtel Money</option>
                        <option value="halopesa">HaloPesa</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Mobile Number
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id="mobileNumber"
                        name="mobileNumber"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                        value={formData.payment.mobileNumber || ''}
                        onChange={(e) => handleInputChange('payment', 'mobileNumber', e.target.value)}
                        placeholder="e.g., 0712345678"
                      />
                    </div>
                  </div>
                </>
              )}
              {formData.payment.paymentMethod === 'other' && (
                <div className="sm:col-span-6">
                  <label htmlFor="paymentReference" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Payment Reference
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="paymentReference"
                      name="paymentReference"
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-white/15 rounded-md"
                      value={formData.payment.paymentReference || ''}
                      onChange={(e) => handleInputChange('payment', 'paymentReference', e.target.value)}
                      placeholder="Enter payment reference or instructions"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Document Upload</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Upload required documents for verification.</p>
            </div>
            <div className="space-y-6">
              {/* ID Proof */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  ID Proof (Passport/National ID)
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    id="idProof"
                    name="idProof"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleInputChange('documents', 'idProof', file);
                      }
                    }}
                  />
                  <label
                    htmlFor="idProof"
                    className="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                  >
                    <span>Upload file</span>
                    <input id="idProof" name="idProof" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {formData.documents.idProof ? formData.documents.idProof.name : 'No file chosen'}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Upload a clear copy of your passport or national ID (PDF, JPG, or PNG, max 5MB)
                </p>
              </div>
              {/* Degree Certificates */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Degree Certificates
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    id="degreeCertificates"
                    name="degreeCertificates"
                    className="sr-only"
                    multiple
                    key={formData.documents.degreeCertificates?.length || 0}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        handleInputChange('documents', 'degreeCertificates', [
                          ...(formData.documents.degreeCertificates || []),
                          ...files
                        ]);
                        // Reset the input value to allow selecting the same file again if needed
                        e.target.value = '';
                      }
                    }}
                  />
                  <label
                    htmlFor="degreeCertificates"
                    className="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                  >
                    <span>Upload files</span>
                  </label>
                  <p className="pl-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {formData.documents.degreeCertificates?.length || 0} files chosen
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Upload copies of your degree certificates (PDF, JPG, or PNG, max 5MB each)
                </p>

                {/* Display uploaded files */}
                {formData.documents.degreeCertificates?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {formData.documents.degreeCertificates.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* CV/Resume */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  CV/Resume
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    id="cv"
                    name="cv"
                    className="sr-only"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleInputChange('documents', 'cv', file);
                      }
                    }}
                  />
                  <label
                    htmlFor="cv"
                    className="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-medium text-indigo-600 hover:text-emerald-500 focus-within:outline-none"
                  >
                    <span>Upload file</span>
                    <input id="cv" name="cv" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {formData.documents.cv ? formData.documents.cv.name : 'No file chosen'}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Upload your CV/Resume (PDF or Word document, max 5MB)
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-white/[0.03] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            Please provide the following information to complete your profile
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Profile Completion</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Complete all sections to finish setting up your profile.
            </p>
          </div>

          <div className="border-b border-gray-200 dark:border-white/10">
            <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
              {[
                { id: 'personal', name: 'Personal', icon: <FiUser className="mr-2" /> },
                { id: 'contact', name: 'Contact', icon: <FiMail className="mr-2" /> },
                { id: 'professional', name: 'Professional', icon: <FiBriefcase className="mr-2" /> },
                { id: 'education', name: 'Education', icon: <FiBook className="mr-2" /> },
                { id: 'membership', name: 'Membership', icon: <FiAward className="mr-2" /> },
                { id: 'payment', name: 'Payment', icon: <FiCreditCard className="mr-2" /> },
                { id: 'documents', name: 'Documents', icon: <FiFileText className="mr-2" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center ${activeSection === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:border-white/15'
                    }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {renderSection()}

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-white/15 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => router.back()}
              >
                Back
              </button>
              <div className="space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => {
                    // Save as draft logic
                    toast.info('Draft saved successfully');
                  }}
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save and Continue'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
