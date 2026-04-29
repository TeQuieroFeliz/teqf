'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, ClockIcon, Minus, PlusCircle } from 'lucide-react';
import moment from 'moment';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { addSubEvent } from '@/actions/sub-event/addSubEvent';
import { editSubEvent } from '@/actions/sub-event/editSubEvent';
import { ItemsTableUserSide } from '@/components/shared/ItemsTableUserSide';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthContext } from '@/context/AuthContext';
import { ProductType } from '@/lib/schemas/ProductSchema';
import {
  Item,
  SubEventDBWithId,
  SubEventFormSchema,
} from '@/lib/schemas/SubEventSchema';
import { cn, generateTimeSlots } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import AddProductInSubEventDialog from './AddProductInSubEventDialog';
import DeleteSubEventDialog from './DeleteSubEvent';
import { HexColorPicker } from 'react-colorful';
import { getSubEvents } from '@/actions/sub-event/getSubEvents';
import { useAddSubEvent } from '@/actions/sub-event/sub-event-rc/addSubEventRc';
import { useGetSubEvents } from '@/actions/sub-event/sub-event-rc/getSubEventRc';
import { useEditSubEvent } from '@/actions/sub-event/sub-event-rc/editSubEventRc';

type Props = {
  products: ProductType[];
  subEvent?: SubEventDBWithId;
  formId?: string;
  hideSubmitButton?: boolean;
  handleOnDeleteWithFilter?: (subEventId: string) => void;
};

const timeSlots = generateTimeSlots();

export function SubEventForm({
  products,
  subEvent,
  handleOnDeleteWithFilter,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [lastValues, setLastValues] = useState<any | null>(null);
  const auth = useAuthContext();
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { addSubEventMutation, addSubEventLoading } = useAddSubEvent(eventId);
  const { refetchSubevents } = useGetSubEvents(eventId);
  const { editSubEventMutation } = useEditSubEvent(eventId);

  const form = useForm<z.infer<typeof SubEventFormSchema>>({
    resolver: zodResolver(SubEventFormSchema),
    defaultValues: {
      subEventName: subEvent?.subEventName || '',
      city: subEvent?.city || '',
      address: subEvent?.address || '',
      startTime: subEvent?.startTime || '',
      finishTime: subEvent?.finishTime || '',
      date: subEvent && subEvent.date ? new Date(subEvent.date) : undefined,
      colors: subEvent?.colors || [
        { colorCode: '#fff' },
        { colorCode: '#fff' },
        { colorCode: '#fff' },
      ],
    },
  });

  const { append, fields, remove } = useFieldArray({
    control: form.control,
    name: 'colors',
  });
  useEffect(() => {
    if (subEvent) {
      setItems(subEvent.items);
      // Store initial values when subEvent exists
      setLastValues({
        subEventName: subEvent.subEventName,
        city: subEvent.city,
        address: subEvent.address,
        startTime: subEvent.startTime,
        finishTime: subEvent.finishTime,
        colors: subEvent.colors,
        date: subEvent.date ? new Date(subEvent.date) : undefined,
      });
    }
  }, [subEvent]);

  const handleEdit = useCallback(
    async (updatedItems?: any) => {
      if (!subEvent) return;

      const currentValues = form.getValues();
      const hasChanged = Object.keys(currentValues).some(
        (key) =>
          currentValues[key as keyof typeof currentValues] !==
          lastValues?.[key as keyof typeof lastValues]
      );

      if (
        !hasChanged &&
        JSON.stringify(items) === JSON.stringify(subEvent.items)
      ) {
        return; // No changes detected
      }

      setIsEditing(true);
      const finalValues = {
        ...currentValues,
        eventId,
        items: updatedItems ? updatedItems : items,
      };

      const user = auth.currentUser;
      if (!user) {
        toast.error('User not found');
        setIsEditing(false);
        return;
      }

      try {
        const { error, message } = await editSubEventMutation({
          formData: finalValues,
          id: subEvent.id,
        });

        if (error) {
          toast.error(message);
        } else {
          // Update lastValues with the successfully saved values
          setLastValues({
            ...currentValues,
            date: currentValues.date ? new Date(currentValues.date) : undefined,
          });
        }
      } catch (error) {
        toast.error('An error occurred while saving changes');
      } finally {
        setIsEditing(false);
        router.refresh();
      }
    },
    [
      subEvent,
      form,
      items,
      eventId,
      auth.currentUser,
      lastValues,
      editSubEventMutation,
      router,
    ]
  );

  // Handle blur events for input fields
  const handleBlur = useCallback(() => {
    if (subEvent) {
      handleEdit();
    }
  }, [subEvent, handleEdit]);

  // Handle change events for select fields and date picker
  const handleSelectChange = useCallback(
    (value: string, field: string) => {
      form.setValue(field as any, value);
      if (subEvent) {
        setTimeout(handleEdit, 300); // Small delay to allow the value to be set
      }
    },
    [form, subEvent, handleEdit]
  );

  const handleDateChange = useCallback(
    (date: Date) => {
      form.setValue('date', date);
      if (subEvent && date) {
        setTimeout(handleEdit, 300);
      }
    },
    [form, subEvent, handleEdit]
  );

  async function handleAdd(values: z.infer<typeof SubEventFormSchema>) {
    try {
      if (!items.length) {
        toast.error('Error!', {
          description: 'Add at least one item to create event',
        });
        return;
      }

      const finalValues = {
        ...values,
        eventId,
        items,
      };

      const user = auth.currentUser;
      if (!user) {
        toast.error('User not found');
        return;
      }
      await addSubEventMutation(finalValues);
      await refetchSubevents();
      form.reset();
      setItems([]);
      setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollToPosition = scrollHeight - window.innerHeight - 350;
        window.scrollTo({
          top: Math.max(0, scrollToPosition), // Ensure we don't get negative values
          behavior: 'smooth',
        });
      }, 1000);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Card>
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-xl sm:text-2xl">
          <div className="flex gap-2 items-center justify-between">
            <span>
              {subEvent ? 'Sub Event Form' : 'Create New Sub Event Form'}
            </span>
            {subEvent && (
              <div>
                <DeleteSubEventDialog
                  subEventId={subEvent.id}
                  handleOnDeleteWithFilter={handleOnDeleteWithFilter}
                />
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
        <Form {...form}>
          <form
            onSubmit={async (e) => {
              await form.handleSubmit(subEvent ? handleEdit : handleAdd)(e);
            }}
          >
            <fieldset
              className="space-y-6 sm:space-y-8"
              disabled={form.formState.isSubmitting}
            >
              {/* Sub Event Name */}
              <FormField
                control={form.control}
                name="subEventName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Sub Event Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sangeet Ceremony"
                        className="text-sm sm:text-base"
                        {...field}
                        onBlur={handleBlur}
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm" />
                  </FormItem>
                )}
              />

              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1/2 w-full">
                      <FormLabel className="text-sm sm:text-base">
                        Date
                      </FormLabel>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal text-sm sm:text-base',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                moment(field.value).format('MMM D, YYYY')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            defaultMonth={field.value}
                            onSelect={(date: any) => {
                              handleDateChange(date);
                              setOpen(false);
                            }}
                            disabled={(date) => date < new Date()}
                            captionLayout="dropdown"
                            endMonth={new Date(2027, 11)}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                {/* Color Picker */}
                <div className="flex-1/2 ">
                  <FormLabel className="text-base">Colors Available</FormLabel>
                  <div className="flex items-center justify-start gap-2 flex-wrap mt-1.5">
                    <div className="flex items-center  justify-start gap-2 flex-wrap">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`colors.${index}.colorCode`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">
                                  Color Code
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <div
                                        className="size-10 rounded-md border flex items-start justify-end cursor-pointer relative"
                                        style={{
                                          backgroundColor: field.value,
                                        }}
                                      >
                                        {fields.length > 3 && (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            className="absolute size-5 border-2 border-white items-center justify-center flex"
                                            size={'icon'}
                                            onClick={() => {
                                              remove(index);
                                            }}
                                          >
                                            <Minus size={3} />
                                          </Button>
                                        )}
                                      </div>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto">
                                    <HexColorPicker
                                      color={field.value}
                                      onChange={field.onChange}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                    {fields.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ colorCode: '#ffffff' })}
                      >
                        Add Color
                      </Button>
                    )}
                    {subEvent && (
                      <Button
                        disabled={isEditing}
                        type="button"
                        variant="outline"
                        className="bg-blue-500 hover:bg-blue-600 text-white hover:text-white"
                        onClick={async () => {
                          await handleEdit();
                          toast.success('Colors has been updated');
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </div>
                  {form.formState.errors.colors?.root?.message && (
                    <p className="text-red-600 text-sm">
                      {form.formState.errors.colors?.root?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* City and Address */}
              <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-8">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Mumbai"
                          className="text-sm sm:text-base"
                          {...field}
                          onBlur={handleBlur}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 123 Celebration Lane"
                          className="text-sm sm:text-base"
                          {...field}
                          onBlur={handleBlur}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration */}
              <div>
                <FormLabel className="text-sm sm:text-base">Duration</FormLabel>
                <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-8 mt-2">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-xs text-muted-foreground">
                          Start Time
                        </FormLabel>
                        <Select
                          onValueChange={(value) =>
                            handleSelectChange(value, 'startTime')
                          }
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-sm sm:text-base">
                              <ClockIcon className="mr-2 h-4 w-4 opacity-50" />
                              <SelectValue placeholder="Start time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {timeSlots.map((slot) => (
                              <SelectItem
                                key={`start-${slot}`}
                                value={slot}
                                className="text-sm sm:text-base"
                              >
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finishTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-xs text-muted-foreground">
                          Finish Time
                        </FormLabel>
                        <Select
                          onValueChange={(value) =>
                            handleSelectChange(value, 'finishTime')
                          }
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-sm sm:text-base">
                              <ClockIcon className="mr-2 h-4 w-4 opacity-50" />
                              <SelectValue placeholder="Finish time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {timeSlots.map((slot) => (
                              <SelectItem
                                key={`finish-${slot}`}
                                value={slot}
                                className="text-sm sm:text-base"
                              >
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="flex gap-3 flex-row items-center justify-between">
                  <h1 className="font-semibold text-base sm:text-lg">
                    Added Products
                  </h1>
                  <div className="self-end sm:self-auto">
                    <AddProductInSubEventDialog
                      products={products}
                      items={items}
                      setItems={setItems}
                      onItemsChange={(items) => subEvent && handleEdit(items)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <ItemsTableUserSide
                    items={items}
                    products={products}
                    setItems={setItems}
                    onItemsChange={(items) => subEvent && handleEdit(items)}
                  />
                </div>
              </div>

              {!subEvent && (
                <div className="text-center">
                  <Button
                    disabled={addSubEventLoading}
                    type="submit"
                    className="w-full gap-2 px-4 py-5 text-base sm:text-lg font-medium sm:px-6 sm:py-6"
                    variant="default"
                  >
                    <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Add Another Sub-Event</span>
                  </Button>
                </div>
              )}
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
