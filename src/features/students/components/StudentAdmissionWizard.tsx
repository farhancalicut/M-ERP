"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentAdmissionSchema, StudentAdmissionData } from "../schemas/studentSchema";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudinaryUpload } from "@/components/shared/CloudinaryUpload";
import { CheckCircle2, ChevronRight, ChevronLeft, Search, User, Loader2 } from "lucide-react";
import { parentService } from "../services/parentService";
import { classService } from "@/features/academic/services/classService";
import { feeCategoryService } from "@/features/fees/services/feeCategoryService";
import { Class, FeeCategory } from "@/types/schema";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface StudentAdmissionWizardProps {
  onSubmit: (data: StudentAdmissionData) => Promise<void>;
  isSubmitting?: boolean | undefined;
  error?: string | undefined;
}

const steps = [
  { id: 0, title: "Student Details" },
  { id: 1, title: "Guardian Details" },
  { id: 2, title: "Academic Info" },
  { id: 3, title: "Payment" },
  { id: 4, title: "Finalize" }
];

export function StudentAdmissionWizard({ onSubmit, isSubmitting, error }: StudentAdmissionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { userData } = useAuthStore();
  
  // Parent Search State
  const [searchPhone, setSearchPhone] = useState("");
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [foundParent, setFoundParent] = useState<any | null>(null);
  const [isParentLocked, setIsParentLocked] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ text: string, type: 'error' | 'info' } | null>(null);

  // Classes State
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Fee State
  const [admissionCategory, setAdmissionCategory] = useState<FeeCategory | null>(null);

  const { register, handleSubmit, setValue, getValues, watch, trigger, formState: { errors } } = useForm<StudentAdmissionData>({
    resolver: zodResolver(studentAdmissionSchema) as any,
    defaultValues: {
      photoUrl: "",
      admissionFeePaymentMethod: "PENDING",
    },
    mode: "onChange"
  });

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 0) {
      fieldsToValidate = ['name', 'gender', 'dob', 'bloodGroup', 'medicalNotes', 'identityMark', 'majorAchievements', 'photoUrl'];
    } else if (currentStep === 1) {
      fieldsToValidate = ['fatherName', 'motherName', 'guardianRelation', 'parentMobile', 'parentEmail', 'address'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['classId', 'admissionDate'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['admissionFeeAmount', 'admissionFeePaymentMethod'];
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setCurrentStep(s => Math.min(s + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(s - 1, 0));
  };

  useEffect(() => {
    if (!searchPhone || searchPhone.length < 10) {
      setFoundParent(null);
      setShowManualForm(false);
      setSearchMessage(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (!userData?.madrassaId) return;
      setIsSearchingParent(true);
      setSearchMessage(null);
      try {
        const parent = await parentService.getParentByMobile(userData.madrassaId, searchPhone);
        if (parent) {
          setFoundParent(parent);
          setShowManualForm(false);
        } else {
          setFoundParent(null);
          setShowManualForm(true);
          setSearchMessage({ text: "No existing guardian found. Please enter details manually.", type: "info" });
        }
      } catch (err) {
        setFoundParent(null);
        setShowManualForm(true);
        setSearchMessage({ text: "Error searching for guardian. You may enter details manually.", type: "error" });
      } finally {
        setIsSearchingParent(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchPhone, userData?.madrassaId]);

  useEffect(() => {
    if (userData?.madrassaId) {
      classService.getClasses(userData.madrassaId, "ALL").then(res => {
        setClasses(res.classes);
        setIsLoadingClasses(false);
      });
      feeCategoryService.getFeeCategories(userData.madrassaId).then(res => {
        const admissionCat = res.categories.find(c => c.feeType === "ADMISSION" && c.status === "ACTIVE");
        if (admissionCat) setAdmissionCategory(admissionCat);
      });
    }
  }, [userData?.madrassaId]);

  // Update admission fee when class changes
  const selectedClassId = watch("classId");
  useEffect(() => {
    if (admissionCategory) {
      let amount = admissionCategory.amount;
      if (admissionCategory.isClassWise && selectedClassId && admissionCategory.classAmounts?.[selectedClassId]) {
        amount = admissionCategory.classAmounts[selectedClassId];
      }
      setValue("admissionFeeAmount", amount);
    }
  }, [selectedClassId, admissionCategory, setValue]);

  const useFoundGuardian = () => {
    if (foundParent) {
      setValue("fatherName", foundParent.fatherName || "", { shouldValidate: true });
      setValue("motherName", foundParent.motherName || "", { shouldValidate: true });
      setValue("parentMobile", foundParent.mobile || "", { shouldValidate: true });
      setValue("parentEmail", foundParent.email || "noemail@m-erp.com", { shouldValidate: true });
      setValue("address", foundParent.address || "", { shouldValidate: true });
      setIsParentLocked(true);
      toast.success("Guardian details populated and locked.");
    }
  };

  const clearGuardianSearch = () => {
    setFoundParent(null);
    setSearchPhone("");
    setIsParentLocked(false);
    setShowManualForm(true);
    setSearchMessage(null);
    setValue("fatherName", "");
    setValue("motherName", "");
    setValue("parentMobile", "");
    setValue("parentEmail", "");
    setValue("address", "");
  };

  const values = getValues();

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      {/* Wizard Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Step {currentStep + 1} of 4 — {steps[currentStep]?.title}</h2>
          <span className="text-sm font-semibold text-muted-foreground">{Math.round(((currentStep) / 3) * 100)}% Completed</span>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1">
              <div 
                className={`h-2 w-full rounded-full transition-colors duration-300 ${
                  currentStep >= step.id ? 'bg-primary' : 'bg-secondary'
                }`}
              />
              <span className={`text-xs mt-2 block text-center font-medium ${
                currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form 
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as any).tagName !== 'TEXTAREA') {
              e.preventDefault();
              if (currentStep < steps.length - 1) nextStep();
            }
          }}
          className="flex-1 overflow-y-auto relative"
        >
          {/* STEP 1: Student Details */}
          <div className={currentStep === 0 ? "block" : "hidden"}>
            <div className="space-y-6">
              <div className="flex justify-center mb-6">
                <CloudinaryUpload onUpload={(url) => setValue("photoUrl", url)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Full Name" required error={errors.name?.message}>
                  <Input {...register("name")} placeholder="Student's legal name" />
                </FormField>
                <FormField label="Gender" required error={errors.gender?.message}>
                  <Select value={watch("gender")} onValueChange={(val) => setValue("gender", val as any, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Date of Birth" required error={errors.dob?.message}>
                  <Input type="date" {...register("dob", { valueAsDate: true })} />
                </FormField>
                <FormField label="Blood Group" error={errors.bloodGroup?.message}>
                  <Input {...register("bloodGroup")} placeholder="e.g. O+, A-, etc." />
                </FormField>
                <FormField label="Identity Mark" error={errors.identityMark?.message}>
                  <Input {...register("identityMark")} placeholder="Any visible identification mark" />
                </FormField>
                <FormField label="Major Achievements" error={errors.majorAchievements?.message}>
                  <Input {...register("majorAchievements")} placeholder="Previous awards or achievements" />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Medical Notes" error={errors.medicalNotes?.message}>
                    <Textarea {...register("medicalNotes")} placeholder="Any allergies, medications, or health conditions" className="resize-none" />
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Guardian Details */}
          <div className={currentStep === 1 ? "block" : "hidden"}>
            <div className="space-y-6">
              
              {/* Search Existing Guardian Block */}
              {!isParentLocked && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mb-8 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Search Existing Guardian</h3>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by Phone Number (e.g. +919876543210)" 
                        className="pl-9"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                      />
                    </div>
                    {isSearchingParent && (
                      <div className="flex items-center justify-center px-4 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-950">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {searchMessage && (
                    <div className={`text-sm mt-2 px-2 ${searchMessage.type === 'error' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      {searchMessage.text}
                    </div>
                  )}

                  {foundParent && (
                    <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-teal-900 dark:text-teal-100">{foundParent.fatherName || foundParent.motherName}</h4>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">Existing</span>
                          </div>
                          <p className="text-sm text-teal-700 dark:text-teal-300">Phone: {foundParent.mobile} • Relation: Existing Parent</p>
                          <p className="text-xs text-teal-600/80 dark:text-teal-400/80 mt-1">{foundParent.address}</p>
                        </div>
                      </div>
                      <Button type="button" onClick={useFoundGuardian} className="bg-teal-600 hover:bg-teal-700 text-white">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Use this guardian
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isParentLocked && (
                <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-lg flex items-center justify-between mb-8">
                   <div>
                     <p className="font-semibold text-teal-900 dark:text-teal-100 flex items-center">
                       <CheckCircle2 className="mr-2 h-4 w-4 text-teal-600" />
                       Using Existing Guardian Profile
                     </p>
                     <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">Fields are locked. Edits can be made in the Parents management page.</p>
                   </div>
                   <Button type="button" variant="outline" size="sm" onClick={clearGuardianSearch} className="border-teal-200 text-teal-700 hover:bg-teal-100">
                     Clear & Enter Manually
                   </Button>
                </div>
              )}

              {(showManualForm || isParentLocked) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <FormField label="Father's Name" required error={errors.fatherName?.message}>
                    <Input {...register("fatherName")} readOnly={isParentLocked} className={isParentLocked ? "bg-muted" : ""} />
                  </FormField>
                  <FormField label="Mother's Name" required error={errors.motherName?.message}>
                    <Input {...register("motherName")} readOnly={isParentLocked} className={isParentLocked ? "bg-muted" : ""} />
                  </FormField>
                  <FormField label="Guardian Relation" required error={errors.guardianRelation?.message}>
                    <Select value={watch("guardianRelation")} onValueChange={(val) => setValue("guardianRelation", val as any, { shouldValidate: true })}>
                      <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FATHER">Father</SelectItem>
                        <SelectItem value="MOTHER">Mother</SelectItem>
                        <SelectItem value="GUARDIAN">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Parent Mobile" required error={errors.parentMobile?.message}>
                    <Input type="tel" {...register("parentMobile")} readOnly={isParentLocked} className={isParentLocked ? "bg-muted" : ""} placeholder="e.g. 9876543210" />
                  </FormField>
                  <FormField label="Parent Email" required error={errors.parentEmail?.message}>
                    <Input type="email" {...register("parentEmail")} readOnly={isParentLocked} className={isParentLocked ? "bg-muted" : ""} placeholder="parent@example.com" />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Permanent Address" required error={errors.address?.message}>
                      <Textarea {...register("address")} readOnly={isParentLocked} className={`resize-none ${isParentLocked ? "bg-muted" : ""}`} />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Academic Information */}
          <div className={currentStep === 2 ? "block" : "hidden"}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Class Admission" required error={errors.classId?.message}>
                  <Select value={watch("classId")} onValueChange={(val) => setValue("classId", val, { shouldValidate: true })} disabled={isLoadingClasses}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select a class"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id!}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Admission Date" required error={errors.admissionDate?.message}>
                  <Input type="date" {...register("admissionDate", { valueAsDate: true })} />
                </FormField>
             </div>
          </div>

          {/* STEP 4: Payment */}
          <div className={currentStep === 3 ? "block" : "hidden"}>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-primary mb-5">Admission Fee Payment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Fee Amount (₹)" required error={errors.admissionFeeAmount?.message}>
                  <Input type="number" {...register("admissionFeeAmount")} />
                </FormField>
                
                <FormField label="Payment Status / Method" required error={errors.admissionFeePaymentMethod?.message}>
                  <Select value={watch("admissionFeePaymentMethod")} onValueChange={(val) => setValue("admissionFeePaymentMethod", val as any, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Keep as Unpaid (Pending)</SelectItem>
                      <SelectItem value="CASH">Paid via Cash</SelectItem>
                      <SelectItem value="BANK">Paid via Bank Transfer</SelectItem>
                      <SelectItem value="UPI">Paid via UPI</SelectItem>
                      <SelectItem value="OTHER">Other Paid Method</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>

          {/* STEP 5: Finalize */}
          <div className={currentStep === 4 ? "block" : "hidden"}>
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Review Admission Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">Student Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Name:</dt><dd className="font-medium">{values.name || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Gender:</dt><dd className="font-medium">{values.gender || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">DOB:</dt><dd className="font-medium">{values.dob ? new Date(values.dob).toLocaleDateString() : '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Blood Group:</dt><dd className="font-medium">{values.bloodGroup || '—'}</dd></div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">Guardian Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Father:</dt><dd className="font-medium">{values.fatherName || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Mother:</dt><dd className="font-medium">{values.motherName || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Relation:</dt><dd className="font-medium">{values.guardianRelation || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Mobile:</dt><dd className="font-medium">{values.parentMobile || '—'}</dd></div>
                    </dl>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-primary mb-3">Academic Placement</h4>
                    <dl className="space-y-2 text-sm max-w-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Class:</dt><dd className="font-medium">{classes.find(c => c.id === values.classId)?.name || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Admission Date:</dt><dd className="font-medium">{values.admissionDate ? new Date(values.admissionDate).toLocaleDateString() : '—'}</dd></div>
                    </dl>
                  </div>
                  
                  {/* Payment Details Overview */}
                  <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-primary mb-3">Admission Fee Payment</h4>
                    <dl className="space-y-2 text-sm max-w-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Amount:</dt><dd className="font-medium">₹{values.admissionFeeAmount || '0'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Status / Method:</dt><dd className="font-medium">{values.admissionFeePaymentMethod || 'PENDING'}</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous Step
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next Step
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Admitting...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Admission</>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
