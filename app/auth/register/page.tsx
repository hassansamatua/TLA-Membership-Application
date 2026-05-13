// app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui";

// List of all Tanzanian regions and their districts
const TANZANIA_DISTRICTS: Record<string, string[]> = {
  "Arusha": ["Arusha City", "Arusha District", "Karatu", "Longido", "Meru", "Monduli", "Ngorongoro"],
  "Dar es Salaam": ["Ilala", "Kigamboni", "Kinondoni", "Temeke", "Ubungo"],
  "Dodoma": ["Bahi", "Chamwino", "Chemba", "Dodoma City", "Kondoa", "Kongwa", "Mpwapwa"],
  "Mwanza": ["Ilemela", "Nyamagana", "Misungwi", "Kwimba", "Magu", "Sengerema", "Ukerewe"],
  "Mbeya": ["Mbeya City", "Mbeya District", "Chunya", "Kyela", "Mbarali", "Rungwe"],
  "Moshi": ["Moshi Urban", "Moshi Rural", "Hai", "Rombo", "Mwanga", "Same"],
  "Tanga": ["Tanga City", "Handeni", "Kilindi", "Korogwe", "Lushoto", "Mkinga", "Muheza", "Pangani"],
  "Morogoro": ["Morogoro Urban", "Morogoro Rural", "Gairo", "Kilombero", "Kilosa", "Mvomero", "Ulanga"],
  "Mtwara": ["Mtwara Urban", "Mtwara Rural", "Masasi", "Nanyumbu", "Newala", "Tandahimba"],
  "Lindi": ["Lindi Urban", "Lindi Rural", "Kilwa", "Liwale", "Nachingwea", "Ruangwa"],
  "Ruvuma": ["Songea Urban", "Songea Rural", "Mbinga", "Namtumbo", "Nyasa", "Tunduru"],
  "Iringa": ["Iringa Urban", "Iringa Rural", "Kilolo", "Mafinga", "Mufindi", "Makete", "Ludewa"],
  "Njombe": ["Njombe Urban", "Njombe Rural", "Ludewa", "Makambako", "Wanging'ombe", "Makete"],
  "Rukwa": ["Sumbawanga Urban", "Sumbawanga Rural", "Kalambo", "Nkasi"],
  "Katavi": ["Mpanda", "Mlele", "Tanganyika"],
  "Shinyanga": ["Shinyanga Urban", "Shinyanga Rural", "Kahama", "Kishapu"],
  "Simiyu": ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"],
  "Geita": ["Geita", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"],
  "Kagera": ["Bukoba Urban", "Bukoba Rural", "Karagwe", "Kyerwa", "Misenyi", "Muleba", "Ngara"],
  "Kigoma": ["Kigoma Urban", "Kigoma Rural", "Kakonko", "Kasulu", "Kibondo", "Uvinza"],
  "Tabora": ["Tabora Urban", "Tabora Rural", "Igunga", "Kaliua", "Nzega", "Sikonge", "Urambo"],
  "Singida": ["Singida Urban", "Singida Rural", "Ikungi", "Iramba", "Manyoni", "Mkalama"],
  "Manyara": ["Babati", "Hanang", "Kiteto", "Mbulu", "Simanjiro"],
  "Pemba North": ["Wete", "Micheweni"],
  "Pemba South": ["Chake Chake", "Mkoani"],
  "Unguja North": ["North A", "North B"],
  "Unguja South": ["Central", "South"]
};

const TANZANIA_REGIONS = Object.keys(TANZANIA_DISTRICTS);

export default function RegisterPage() {
  type MembershipType = 'librarian' | 'regular' | 'organization';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    nida: "",
    membershipType: "regular" as MembershipType,
    phoneNumber: "",
    organizationName: "",
    contactPersonName: "",
    contactPersonEmail: "",
    // New fields
    dateOfBirth: "",
    gender: "",
    country: "Tanzania",
    region: "",
    district: "",
    ward: "",
    street: "",
    houseNumber: "",
    postalAddress: "",
    postalCode: "",
    occupation: "",
    employerName: "",
    workAddress: "",
    workPhone: "",
    workEmail: "",
    educationLevel: "",
    institutionName: "",
    yearOfCompletion: "",
    skills: "",
    membershipNumber: "", // Auto-generated
    membershipDate: new Date().toISOString().split('T')[0],
    agreeToTerms: false,
    agreeToDataProcessing: false
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Clear organization name when not organization type
      ...(name === 'membershipType' && value !== 'organization' ? { 
        organizationName: '',
        contactPersonName: '',
        contactPersonEmail: ''
      } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Get current form values directly from the event to avoid state timing issues
    const form = e.target as HTMLFormElement;
    const formDataFromForm = new FormData(form);
    
    const password = formDataFromForm.get('password') as string || "";
    const confirmPassword = formDataFromForm.get('confirmPassword') as string || "";

    // Trim passwords to remove leading/trailing whitespace
    const trimmedPassword = password?.trim() || "";
    const trimmedConfirmPassword = confirmPassword?.trim() || "";

    // Password validation
    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.nida || formData.nida.length < 16) {
      setError("Please enter a valid NIDA number (16 digits)");
      return;
    }

    // Check required academic fields
    if (!formData.educationLevel || !formData.institutionName || !formData.yearOfCompletion) {
      setError("Please fill in all required academic information (Education Level, Institution Name, and Year of Completion)");
      return;
    }

    // Check required employment fields
    if (!formData.occupation || !formData.employerName || !formData.workAddress) {
      setError("Please fill in all required employment information (Occupation, Employer Name, and Work Address)");
      return;
    }

    // Check required organization fields if organization type
    if (formData.membershipType === 'organization') {
      if (!formData.contactPersonName || !formData.contactPersonEmail) {
        setError("Please fill in all required organization information (Contact Person Name and Email)");
        return;
      }
    }

    if (!formData.agreeToTerms || !formData.agreeToDataProcessing) {
      setError("You must agree to terms and conditions and data processing policy");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data to send to API with explicit type assertion
      const userData = {
        ...formData,
        // For organization, use organization name as the name
        name: formData.membershipType === 'organization' ? formData.organizationName : formData.name,
        // Use trimmed password from form
        password: trimmedPassword,
        // Send confirmPassword for server-side validation
        confirmPassword: trimmedConfirmPassword,
        // Remove checkboxes from data sent to server
        agreeToTerms: undefined,
        agreeToDataProcessing: undefined,
        // Ensure membershipType is explicitly typed
        membershipType: formData.membershipType as 'librarian' | 'regular' | 'organization'
      };

      await register(userData);
      router.push('/auth/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render form sections — each section is a self-contained
  // rounded card so the long form scans as discrete steps.
  const renderSection = (title: string, children: React.ReactNode) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-gray-900/60">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 py-10 dark:from-gray-950 dark:via-gray-950 dark:to-emerald-950/30">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Brand + intro */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <span className="text-sm font-bold">TLA</span>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Membership application
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-gray-50">
            Create your TLA account
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Fill in the form below. Fields marked with{' '}
            <span className="font-medium text-red-500">*</span> are required.
            Your application will be reviewed by an administrator.
          </p>
          <Link
            href="/auth/login"
            className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Already a member? Sign in instead
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          {renderSection("Personal Information",
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Membership Type <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="membershipTypeRegular"
                        name="membershipType"
                        type="radio"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        value="regular"
                        checked={formData.membershipType === 'regular'}
                        onChange={handleChange}
                      />
                      <label htmlFor="membershipTypeRegular" className="ml-2 block text-sm text-gray-700">
                        Regular (Student/Individual) - 40,000 TZS
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="membershipTypeLibrarian"
                        name="membershipType"
                        type="radio"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        value="librarian"
                        checked={formData.membershipType === 'librarian'}
                        onChange={handleChange}
                      />
                      <label htmlFor="membershipTypeLibrarian" className="ml-2 block text-sm text-gray-700">
                        Librarian - 40,000 TZS
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="membershipTypeOrganization"
                        name="membershipType"
                        type="radio"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        value="organization"
                        checked={formData.membershipType === 'organization'}
                        onChange={handleChange}
                      />
                      <label htmlFor="membershipTypeOrganization" className="ml-2 block text-sm text-gray-700">
                        Organization - 150,000 TZS
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.membershipType === 'organization' ? 'Organization Name' : 'Full Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={formData.membershipType === 'organization' ? 'organizationName' : 'name'}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.membershipType === 'organization' ? formData.organizationName : formData.name}
                    onChange={handleChange}
                    placeholder={formData.membershipType === 'organization' ? 'Enter organization name' : 'Enter your full name'}
                  />
                </div>
                
                {/* Organization Contact Person Fields (only show for organization type) */}
                {formData.membershipType === 'organization' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contact Person Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contactPersonName"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        value={formData.contactPersonName || ''}
                        onChange={handleChange}
                        placeholder="Contact person's full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contact Person Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="contactPersonEmail"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        value={formData.contactPersonEmail || ''}
                        onChange={handleChange}
                        placeholder="Contact person's email address"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    National ID (NIDA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nida"
                    required
                    minLength={16}
                    maxLength={16}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.nida}
                    onChange={handleChange}
                    placeholder="16-digit NIDA number"
                  />
                </div>
              </div>
            </>
          )}

          {/* Contact Information Section */}
          {renderSection("Contact Information",
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      minLength={8}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <Eye className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={8}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    name="country"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="Tanzania">Tanzania</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Region
                  </label>
                  <select
                    name="region"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.region}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        region: e.target.value,
                        district: ""
                      }));
                    }}
                  >
                    <option value="">Select Region</option>
                    {TANZANIA_REGIONS.map(region => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    District
                  </label>
                  <select
                    name="district"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.region}
                  >
                    <option value="">{formData.region ? "Select District" : "Select Region First"}</option>
                    {formData.region && TANZANIA_DISTRICTS[formData.region]?.map(district => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ward
                  </label>
                  <input
                    type="text"
                    name="ward"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.ward}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Street
                  </label>
                  <input
                    type="text"
                    name="street"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.street}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    House Number
                  </label>
                  <input
                    type="text"
                    name="houseNumber"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.houseNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Postal Address
                  </label>
                  <input
                    type="text"
                    name="postalAddress"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.postalAddress}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.postalCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {/* Academic Qualifications Section */}
          {renderSection("Academic Qualifications",
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Highest Education Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="educationLevel"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.educationLevel}
                    onChange={handleChange}
                  >
                    <option value="">Select Education Level</option>
                    <option value="Primary">Primary School</option>
                    <option value="O-Level">O-Level</option>
                    <option value="A-Level">A-Level</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Bachelor">Bachelor's Degree</option>
                    <option value="Master">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Institution Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="institutionName"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.institutionName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Year of Completion <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="yearOfCompletion"
                    required
                    min="1900"
                    max={new Date().getFullYear()}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.yearOfCompletion}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Skills/Qualifications
                  </label>
                  <input
                    type="text"
                    name="skills"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="e.g., Computer Skills, Languages, etc."
                  />
                </div>
              </div>
            </>
          )}

          {/* Employment Information Section */}
          {renderSection("Employment Information",
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Occupation/Profession <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.occupation}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employerName"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.employerName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Work Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="workAddress"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.workAddress}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Work Phone
                  </label>
                  <input
                    type="tel"
                    name="workPhone"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.workPhone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Work Email
                  </label>
                  <input
                    type="email"
                    name="workEmail"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.workEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {/* Membership Information Section */}
          {renderSection("Membership Information",
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Membership Number
                  </label>
                  <input
                    type="text"
                    name="membershipNumber"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100"
                    value={formData.membershipNumber || "Will be generated after approval"}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Membership Date
                </label>
                <input
                  type="text"
                  name="membershipDate" readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.membershipDate}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* Terms and Conditions */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  required
                  className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreeToTerms" className="font-medium text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-emerald-600 hover:text-emerald-500" target="_blank" rel="noopener noreferrer">
                    Terms and Conditions
                  </Link>{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </div>

            <div className="flex items-start mt-4">
              <div className="flex items-center h-5">
                <input
                  id="agreeToDataProcessing"
                  name="agreeToDataProcessing"
                  type="checkbox"
                  required
                  className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  checked={formData.agreeToDataProcessing}
                  onChange={handleChange}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreeToDataProcessing" className="font-medium text-gray-700">
                  I consent to the processing of my personal data in accordance with the{' '}
                  <Link href="/privacy" className="text-emerald-600 hover:text-emerald-500" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Register'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}