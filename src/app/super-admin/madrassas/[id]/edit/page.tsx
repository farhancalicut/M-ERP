"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Building2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { madrassaService } from "@/features/super-admin/services/madrassaService";
import { Madrassa, PlatformBoard } from "@/types/schema";
import { settingsService } from "@/features/super-admin/services/settingsService";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  board: z.string().min(1, "Please select a board"),
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(4, "Valid pincode required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditMadrassaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [madrassa, setMadrassa] = useState<Madrassa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [boards, setBoards] = useState<PlatformBoard[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      board: "AP_SAMASTHA",
      addressLine1: "",
      city: "",
      state: "",
      pincode: "",
      contactNumber: "",
      email: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [madrassaData, fetchedBoards] = await Promise.all([
          madrassaService.getMadrassaById(id as string),
          settingsService.getBoards()
        ]);
        
        setBoards(fetchedBoards);
        if (madrassaData) {
          setMadrassa(madrassaData);
          form.reset({
            name: madrassaData.name,
            board: madrassaData.board || "",
            addressLine1: madrassaData.addressLine1,
            city: madrassaData.city,
            state: madrassaData.state,
            pincode: madrassaData.pincode,
            contactNumber: madrassaData.contactNumber,
            email: madrassaData.email,
          });
        }
      } catch (error) {
        toast.error("Failed to load details");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, form]);

  const onSubmit = async (data: FormValues) => {
    if (!id) return;
    setIsSaving(true);
    try {
      await madrassaService.updateMadrassa(id as string, data);
      toast.success("Madrassa details updated successfully");
      router.push(`/super-admin/madrassas/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update details");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">Loading Form...</p>
      </div>
    );
  }

  if (!madrassa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">Madrassa Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/super-admin/madrassas">Return to Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/super-admin/madrassas/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Madrassa</h1>
          <p className="text-muted-foreground mt-1">
            Updating details for {madrassa.name}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Core Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Madrassa Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Al-Noor Islamic Academy" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="board"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Assignment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select board" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {boards.length === 0 ? (
                          <SelectItem value="none" disabled>No boards found</SelectItem>
                        ) : (
                          boards.map(b => (
                            <SelectItem key={b.id} value={b.code}>{b.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="bg-amber-50 text-amber-800 p-2 rounded flex items-start gap-2 text-xs mt-1 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <p>As Super Admin, you can change the board. Proceed with caution.</p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Email</FormLabel>
                    <FormControl><Input placeholder="contact@alnoor.edu" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address, building name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State (e.g. Kerala)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="Pincode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-6 border-t gap-4">
              <Button variant="outline" type="button" asChild>
                <Link href={`/super-admin/madrassas/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving Changes..." : "Save Changes"}
                {!isSaving && <Save className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
