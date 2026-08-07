const { z } = require('zod');

const BookSchema = z.object({
    title: z.string().min(1),
    product_url: z.string().url(),
    price_text: z.string().nullable(),
    price_gbp: z.number().nullable(),
    availability_text: z.string().nullable(),
    availability_count: z.number().nullable(),
    rating_text: z.string().nullable(),
    rating_number: z.number().int().min(0).max(5).nullable(),
    description: z.string().nullable(),
    source_page: z.string().url(),
    fetched_at: z.string().datetime()
});

function validateRecord(record) {
    try {
        const validated = BookSchema.parse(record);
        return { valid: true, data: validated, errors: null };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                data: null,
                errors: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        return { valid: false, data: null, errors: [{ message: error.message }] };
    }
}

module.exports = { validateRecord, BookSchema };
