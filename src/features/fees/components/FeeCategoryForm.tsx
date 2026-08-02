"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { feeCategorySchema, FeeCategoryFormValues } from "../schemas/feeSchemas";
import { FeeCategory, Class } from "@/types/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

interface FeeCategoryFormProps {
  initialData?: FeeCategory | undefined;
  classes?: Class[];
  onSubmit: (data: FeeCategoryFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function FeeCategoryForm({
  initialData,
  classes = [],
  onSubmit,
  isLoading
}: FeeCategoryFormProps) {
  const form = useForm<FeeCategoryFormValues>({
    resolver: zodResolver(feeCategorySchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      feeType: initialData?.feeType || "CUSTOM",
      recurring: initialData?.recurring || false,
      isClassWise: initialData?.isClassWise || false,
      classAmounts: initialData?.classAmounts || {},
    },
  });

  const isClassWise = form.watch("isClassWise");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Monthly Tuition Fee" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isClassWise && (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="feeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MONTHLY_TUITION">Monthly Tuition</SelectItem>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="EXAM">Exam</SelectItem>
                    <SelectItem value="BOOK">Book</SelectItem>
                    <SelectItem value="UNIFORM">Uniform</SelectItem>
                    <SelectItem value="TRANSPORT">Transport</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <TooltipProvider>
            <FormField
              control={form.control}
              name="recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-full">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none w-full">
                    <div className="flex items-center gap-2">
                      <FormLabel>Recurring Fee</FormLabel>
                      <Tooltip>
                        <TooltipTrigger type="button"><InfoIcon className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>
                          <p className="w-64 text-sm">Check this if the fee is charged periodically (like Tuition or Bus fees). You will generate these manually each month.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This fee can be generated periodically
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isClassWise"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-full">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none w-full">
                    <div className="flex items-center gap-2">
                      <FormLabel>Set amounts per class</FormLabel>
                      <Tooltip>
                        <TooltipTrigger type="button"><InfoIcon className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>
                          <p className="w-64 text-sm">Allows you to charge a different amount based on the student's current class.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable varying fees by class
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </TooltipProvider>
        </div>

        {isClassWise && classes.length > 0 && (
          <div className="space-y-4 border rounded-lg p-6 bg-muted/30">
            <h3 className="text-lg font-medium">Class-wise Amounts</h3>
            <p className="text-sm text-muted-foreground mb-4">Set specific fee amounts for each class.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(cls => (
                <FormField
                  key={cls.id}
                  control={form.control}
                  name={`classAmounts.${cls.id!}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cls.name}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          value={field.value || ""}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details about this fee..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
