"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, FileText, Search, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlatformQuestionPaper, PlatformBoard } from "@/types/schema";
import { questionPaperService } from "@/features/super-admin/services/questionPaperService";
import { settingsService } from "@/features/super-admin/services/settingsService";
import { STANDARD_CLASSES } from "@/constants/academic";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  boardId: z.string().min(1, "Please select a board"),
  globalClassId: z.string().min(1, "Please select a class"),
  subject: z.string().min(2, "Subject is required"),
  year: z.string().min(4, "Valid year is required (e.g., 2024)"),
  fileUrl: z.string().url("Must be a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

export default function QuestionPapersPage() {
  const [papers, setPapers] = useState<PlatformQuestionPaper[]>([]);
  const [boards, setBoards] = useState<PlatformBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBoardFilter, setSelectedBoardFilter] = useState("all");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      boardId: "",
      globalClassId: "",
      subject: "",
      year: new Date().getFullYear().toString(),
      fileUrl: "",
    },
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedPapers, fetchedBoards] = await Promise.all([
        questionPaperService.getQuestionPapers(),
        settingsService.getBoards()
      ]);
      setPapers(fetchedPapers);
      setBoards(fetchedBoards);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (paper?: PlatformQuestionPaper) => {
    if (paper) {
      setEditingId(paper.id || null);
      form.reset({
        title: paper.title,
        boardId: paper.boardId,
        globalClassId: paper.globalClassId || "",
        subject: paper.subject,
        year: paper.year,
        fileUrl: paper.fileUrl,
      });
    } else {
      setEditingId(null);
      form.reset({
        title: "",
        boardId: "",
        globalClassId: "",
        subject: "",
        year: new Date().getFullYear().toString(),
        fileUrl: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const selectedClass = STANDARD_CLASSES.find(c => c.id === data.globalClassId);
      
      const payload = {
        ...data,
        classLevel: selectedClass ? selectedClass.name : data.globalClassId
      };
      
      await questionPaperService.saveQuestionPaper(payload as any, editingId || undefined);
      toast.success(editingId ? "Question paper updated successfully" : "Question paper added successfully");
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to add question paper");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question paper?")) return;
    try {
      await questionPaperService.deleteQuestionPaper(id);
      toast.success("Deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete question paper");
    }
  };

  const getBoardName = (boardId: string) => {
    const board = boards.find(b => b.code === boardId);
    return board ? board.name : boardId;
  };

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (paper.classLevel && paper.classLevel.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBoard = selectedBoardFilter === "all" || paper.boardId === selectedBoardFilter;
    return matchesSearch && matchesBoard;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Question Papers</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage global question papers for all boards. Madrassas will automatically see papers assigned to their board.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Question Paper
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by title, subject, or class..."
              className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedBoardFilter} onValueChange={setSelectedBoardFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boards</SelectItem>
              {boards.map(b => (
                <SelectItem key={b.id} value={b.code}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">No question papers found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4 mt-1">Upload your first question paper to distribute it.</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">Upload Paper</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map(paper => (
                <div key={paper.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative flex flex-col group hover:shadow-md transition-shadow bg-white dark:bg-slate-900 hover:border-slate-300">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" onClick={() => handleOpenDialog(paper)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" onClick={() => paper.id && handleDelete(paper.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="mb-4">
                    <span className="bg-primary/10 text-primary dark:text-primary-foreground text-xs px-2.5 py-1 rounded-full font-semibold inline-block mb-3 border border-primary/20">
                      {getBoardName(paper.boardId)}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-2" title={paper.title}>{paper.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{paper.subject} • {paper.classLevel || paper.globalClassId} • {paper.year}</p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" className="w-full text-primary hover:bg-primary/10 border-slate-200 dark:border-slate-800" asChild>
                      <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Document
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Question Paper" : "Add Question Paper"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Class 5 Fiqh Half Yearly 2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="boardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {boards.length === 0 ? (
                            <SelectItem value="none" disabled>No boards available</SelectItem>
                          ) : (
                            boards.map(b => (
                              <SelectItem key={b.id} value={b.code}>{b.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl><Input placeholder="e.g. 2024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="globalClassId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STANDARD_CLASSES.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl><Input placeholder="e.g. Fiqh" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Link (URL)</FormLabel>
                    <FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Question Paper"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
