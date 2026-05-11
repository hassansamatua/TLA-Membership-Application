interface ProfileData {
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
    highestDegree: string;
    institution: string;
    yearOfGraduation: string;
    additionalCertifications: string;
  }[];
  membership: {
    membershipType: string;
    membershipNumber: string;
    membershipStatus: string;
    joinDate: string;
    areasOfInterest: string;
  };
  payment: {
    paymentMethod: string;
    accountNumber: string;
    bankName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
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
}

export function calculateProfileCompletion(profile: Partial<ProfileData>): {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
} {
  const completedSections: string[] = [];
  const missingSections: string[] = [];
  let totalFields = 0;
  let completedFields = 0;

  // Personal Info (7 fields)
  const personalFields = [
    { key: 'fullName', label: 'Full Name', value: profile.personalInfo?.fullName },
    { key: 'dateOfBirth', label: 'Date of Birth', value: profile.personalInfo?.dateOfBirth },
    { key: 'gender', label: 'Gender', value: profile.personalInfo?.gender },
    { key: 'placeOfBirth', label: 'Place of Birth', value: profile.personalInfo?.placeOfBirth },
    { key: 'nationality', label: 'Nationality', value: profile.personalInfo?.nationality },
    { key: 'idNumber', label: 'ID Number', value: profile.personalInfo?.idNumber },
    { key: 'profilePicture', label: 'Profile Picture', value: profile.personalInfo?.profilePicture }
  ];
  
  personalFields.forEach(field => {
    totalFields++;
    if (field.value && field.value !== '' && field.value !== null) {
      completedFields++;
    } else {
      missingSections.push(`Personal: ${field.label}`);
    }
  });

  if (personalFields.filter(f => f.value && f.value !== '' && f.value !== null).length >= 4) {
    completedSections.push('Personal Information');
  }

  // Contact Info (6 fields)
  const contactFields = [
    { key: 'email', label: 'Email', value: profile.contactInfo?.email },
    { key: 'phone', label: 'Phone', value: profile.contactInfo?.phone },
    { key: 'address', label: 'Address', value: profile.contactInfo?.address },
    { key: 'city', label: 'City', value: profile.contactInfo?.city },
    { key: 'country', label: 'Country', value: profile.contactInfo?.country },
    { key: 'postalCode', label: 'Postal Code', value: profile.contactInfo?.postalCode }
  ];
  
  contactFields.forEach(field => {
    totalFields++;
    if (field.value && field.value !== '') {
      completedFields++;
    } else {
      missingSections.push(`Contact: ${field.label}`);
    }
  });

  if (contactFields.filter(f => f.value && f.value !== '').length >= 4) {
    completedSections.push('Contact Information');
  }

  // Professional Info (5 fields)
  const professionalFields = [
    { key: 'occupation', label: 'Occupation', value: profile.professionalInfo?.occupation },
    { key: 'company', label: 'Company', value: profile.professionalInfo?.company },
    { key: 'industry', label: 'Industry', value: profile.professionalInfo?.industry },
    { key: 'yearsOfExperience', label: 'Years of Experience', value: profile.professionalInfo?.yearsOfExperience },
    { key: 'specialization', label: 'Specialization', value: profile.professionalInfo?.specialization }
  ];
  
  professionalFields.forEach(field => {
    totalFields++;
    if (field.value && field.value !== '') {
      completedFields++;
    } else {
      missingSections.push(`Professional: ${field.label}`);
    }
  });

  if (professionalFields.filter(f => f.value && f.value !== '').length >= 3) {
    completedSections.push('Professional Information');
  }

  // Education (4 fields per education entry)
  if (profile.education && profile.education.length > 0) {
    profile.education.forEach((edu, index) => {
      const eduFields = [
        { key: `highestDegree_${index}`, label: `Highest Degree ${index + 1}`, value: edu.highestDegree },
        { key: `institution_${index}`, label: `Institution ${index + 1}`, value: edu.institution },
        { key: `yearOfGraduation_${index}`, label: `Year of Graduation ${index + 1}`, value: edu.yearOfGraduation },
        { key: `additionalCertifications_${index}`, label: `Additional Certifications ${index + 1}`, value: edu.additionalCertifications }
      ];
      
      eduFields.forEach(field => {
        totalFields++;
        if (field.value && field.value !== '') {
          completedFields++;
        } else {
          missingSections.push(`Education: ${field.label}`);
        }
      });
    });
    
    if (profile.education.filter(e => e.highestDegree && e.institution && e.yearOfGraduation).length > 0) {
      completedSections.push('Education');
    }
  }

  // Membership (4 fields)
  const membershipFields = [
    { key: 'membershipType', label: 'Membership Type', value: profile.membership?.membershipType },
    { key: 'membershipNumber', label: 'Membership Number', value: profile.membership?.membershipNumber },
    { key: 'membershipStatus', label: 'Membership Status', value: profile.membership?.membershipStatus },
    { key: 'areasOfInterest', label: 'Areas of Interest', value: profile.membership?.areasOfInterest }
  ];
  
  membershipFields.forEach(field => {
    totalFields++;
    if (field.value && field.value !== '') {
      completedFields++;
    } else {
      missingSections.push(`Membership: ${field.label}`);
    }
  });

  if (membershipFields.filter(f => f.value && f.value !== '').length >= 2) {
    completedSections.push('Membership');
  }

  // Payment (5 fields)
  const paymentFields = [
    { key: 'paymentMethod', label: 'Payment Method', value: profile.payment?.paymentMethod },
    { key: 'accountNumber', label: 'Account Number', value: profile.payment?.accountNumber },
    { key: 'bankName', label: 'Bank Name', value: profile.payment?.bankName },
    { key: 'cardNumber', label: 'Card Number', value: profile.payment?.cardNumber },
    { key: 'expiryDate', label: 'Expiry Date', value: profile.payment?.expiryDate }
  ];
  
  paymentFields.forEach(field => {
    totalFields++;
    if (field.value && field.value !== '') {
      completedFields++;
    } else {
      missingSections.push(`Payment: ${field.label}`);
    }
  });

  if (paymentFields.filter(f => f.value && f.value !== '').length >= 3) {
    completedSections.push('Payment Information');
  }

  // Documents (3 fields)
  const documentFields = [
    { key: 'idProof', label: 'ID Proof', value: profile.documents?.idProof },
    { key: 'degreeCertificates', label: 'Degree Certificates', value: profile.documents?.degreeCertificates },
    { key: 'cv', label: 'CV', value: profile.documents?.cv }
  ];
  
  documentFields.forEach(field => {
    totalFields++;
    if (field.value && (typeof field.value === 'object' ? Array.isArray(field.value) && field.value.length > 0 : field.value !== null)) {
      completedFields++;
    } else {
      missingSections.push(`Documents: ${field.label}`);
    }
  });

  if (documentFields.filter(f => f.value && (typeof f.value === 'object' ? Array.isArray(f.value) && f.value.length > 0 : f.value !== null)).length >= 2) {
    completedSections.push('Documents');
  }

  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    percentage,
    completedSections,
    missingSections
  };
}

export function canAccessDashboard(profile: Partial<ProfileData>): boolean {
  const { percentage } = calculateProfileCompletion(profile);
  return percentage >= 50;
}
