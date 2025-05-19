import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

// --- Email Sending Logic using Resend ---
async function sendReminderEmail(
    reminder: {
        id: string;
        recipient_email: string | null;
        recipient_name: string | null;
        access_token: string;
        title: string | null;
        message: string | null;
        creator_name: string | null;
        type: 'initial' | 'pre_due' | 'due' | 'reminder';
        scheduled_delivery_at?: string;
    }
): Promise<boolean> {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const siteUrl = Deno.env.get('SITE_URL'); // Base URL for links

    if (!resendApiKey || !fromEmail) {
        console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variables.');
        return false;
    }
    if (!reminder.recipient_email) {
        console.warn(`Reminder ${reminder.id} has method 'email' but no recipient_email.`);
        return false; // Cannot send email without address
    }
    if (!siteUrl) {
        console.error('Missing SITE_URL environment variable for link generation.');
        return false; // Cannot generate links without base URL
    }

    const reminderLink = `${siteUrl.replace(/\/$/, '')}/reminder/${reminder.access_token}`;
    let subject = '';
    let htmlBody = '';

    // Plantillas según tipo de notificación
    switch (reminder.type) {
        case 'initial':
            subject = reminder.title || `Has recibido una cápsula de ${reminder.creator_name || 'alguien especial'}`;
            htmlBody = `
                <div style="max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;padding:32px 24px 24px 24px;font-family:sans-serif;border:1px solid #e0e7ef;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <img src="https://vox-eternal.com/logo-vox.png" alt="Vox Eternal" style="width:120px;height:auto;margin-bottom:8px;" />
                    </div>
                    <h2 style="color:#0D3D56;font-size:22px;font-weight:700;margin-bottom:16px;">¡Has recibido una cápsula del tiempo!</h2>
                    <p style="color:#222;font-size:16px;margin-bottom:12px;">Hola <strong>${reminder.recipient_name || ''}</strong>,</p>
                    <p style="color:#222;font-size:16px;margin-bottom:12px;">
                        <strong>${reminder.creator_name || 'Alguien especial'}</strong> te ha enviado una cápsula que se abrirá el <b>${reminder.scheduled_delivery_at ? new Date(reminder.scheduled_delivery_at).toLocaleString() : ''}</b>.
                    </p>
                    ${reminder.message ? `<div style="background:#e6f4fa;border-left:4px solid #0D3D56;padding:12px 16px;margin:18px 0 18px 0;border-radius:6px;">
                        <span style="color:#0D3D56;font-weight:600;">Mensaje:</span> ${reminder.message}
                    </div>` : ''}
                    <div style="text-align:center;margin-bottom:24px;">
                        <a href="${reminderLink}" style="display:inline-block;background:#0D3D56;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(13,61,86,0.08);">Ver cápsula</a>
                    </div>
                    <hr style="border:none;border-top:1px solid #e0e7ef;margin:32px 0 18px 0;" />
                    <p style="color:#888;font-size:13px;text-align:center;">Saludos,<br/>El equipo de Vox Eternal</p>
                </div>
            `;
            break;
        case 'pre_due':
            subject = '¡Ya falta poco para abrir tu cápsula!';
            htmlBody = `
                <div style="max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;padding:32px 24px 24px 24px;font-family:sans-serif;border:1px solid #e0e7ef;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <img src="https://vox-eternal.com/logo-vox.png" alt="Vox Eternal" style="width:120px;height:auto;margin-bottom:8px;" />
                    </div>
                    <h2 style="color:#0D3D56;font-size:22px;font-weight:700;margin-bottom:16px;">¡Ya falta poco!</h2>
                    <p style="color:#222;font-size:16px;margin-bottom:12px;">Mañana podrás abrir tu cápsula programada.</p>
                    <div style="text-align:center;margin-bottom:24px;">
                        <a href="${reminderLink}" style="display:inline-block;background:#0D3D56;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(13,61,86,0.08);">Ver cápsula</a>
                    </div>
                    <hr style="border:none;border-top:1px solid #e0e7ef;margin:32px 0 18px 0;" />
                    <p style="color:#888;font-size:13px;text-align:center;">Saludos,<br/>El equipo de Vox Eternal</p>
                </div>
            `;
            break;
        case 'due':
            subject = '¡Tu cápsula ya está disponible!';
            htmlBody = `
                <div style="max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;padding:32px 24px 24px 24px;font-family:sans-serif;border:1px solid #e0e7ef;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <img src="https://vox-eternal.com/logo-vox.png" alt="Vox Eternal" style="width:120px;height:auto;margin-bottom:8px;" />
                    </div>
                    <h2 style="color:#0D3D56;font-size:22px;font-weight:700;margin-bottom:16px;">¡Tu cápsula ya está disponible!</h2>
                    <p style="color:#222;font-size:16px;margin-bottom:12px;">Ya puedes abrir tu cápsula programada y descubrir su contenido.</p>
                    <div style="text-align:center;margin-bottom:24px;">
                        <a href="${reminderLink}" style="display:inline-block;background:#0D3D56;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(13,61,86,0.08);">Abrir cápsula</a>
                    </div>
                    <hr style="border:none;border-top:1px solid #e0e7ef;margin:32px 0 18px 0;" />
                    <p style="color:#888;font-size:13px;text-align:center;">Saludos,<br/>El equipo de Vox Eternal</p>
                </div>
            `;
            break;
        case 'reminder':
            subject = 'Tu cápsula sigue esperando por ti';
            htmlBody = `
                <div style="max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;padding:32px 24px 24px 24px;font-family:sans-serif;border:1px solid #e0e7ef;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <img src="https://vox-eternal.com/logo-vox.png" alt="Vox Eternal" style="width:120px;height:auto;margin-bottom:8px;" />
                    </div>
                    <h2 style="color:#0D3D56;font-size:22px;font-weight:700;margin-bottom:16px;">¡Tu cápsula sigue esperando por ti!</h2>
                    <p style="color:#222;font-size:16px;margin-bottom:12px;">Aún no has abierto tu cápsula. Hazlo cuando quieras, está lista para ti.</p>
                    <div style="text-align:center;margin-bottom:24px;">
                        <a href="${reminderLink}" style="display:inline-block;background:#0D3D56;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(13,61,86,0.08);">Abrir cápsula</a>
                    </div>
                    <hr style="border:none;border-top:1px solid #e0e7ef;margin:32px 0 18px 0;" />
                    <p style="color:#888;font-size:13px;text-align:center;">Saludos,<br/>El equipo de Vox Eternal</p>
                </div>
            `;
            break;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [reminder.recipient_email],
                subject: subject,
                html: htmlBody,
            }),
        });

        if (response.ok) {
            return true;
        } else {
            const responseBody = await response.text();
            console.error(`Failed to send email via Resend for reminder ${reminder.id}. Status: ${response.status}`, responseBody);
            return false;
        }
    } catch (error) {
        console.error(`Error calling Resend API for reminder ${reminder.id}:`, error);
        return false;
    }
}
// --- End Email Sending Logic ---

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('Processing scheduled reminders...');

    try {
        const supabaseAdmin = createClient<Database>(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const now = new Date();
        const nowISO = now.toISOString();

        // 1. Enviar email 1 día antes (pre_due)
        const preDueStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 60 * 60 * 1000); // 23h a 25h window
        const preDueEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
        const { data: preDueReminders } = await supabaseAdmin
            .from('future_reminders')
            .select(`
                id, recipient_email, recipient_name, delivery_method, access_token, title, message, creator_user_id, scheduled_delivery_at, pre_due_notification_sent_at, usuarios ( nombre )
            `)
            .eq('status', 'scheduled')
            .is('pre_due_notification_sent_at', null)
            .gte('scheduled_delivery_at', preDueStart.toISOString())
            .lte('scheduled_delivery_at', preDueEnd.toISOString());

        if (preDueReminders && preDueReminders.length > 0) {
            for (const reminder of preDueReminders) {
                if (reminder.delivery_method === 'email') {
                    const creatorName = reminder.usuarios?.nombre ?? null;
                    const sent = await sendReminderEmail({
                        id: reminder.id,
                        recipient_email: reminder.recipient_email,
                        recipient_name: reminder.recipient_name,
                        access_token: reminder.access_token,
                        title: reminder.title,
                        message: reminder.message,
                        creator_name: creatorName,
                        type: 'pre_due',
                        scheduled_delivery_at: reminder.scheduled_delivery_at,
                    });
                    if (sent) {
                        await supabaseAdmin
                            .from('future_reminders')
                            .update({ pre_due_notification_sent_at: nowISO, updated_at: nowISO })
                            .eq('id', reminder.id);
                    }
                }
            }
        }

        // 2. Enviar email en due date (cápsula disponible)
        const { data: dueReminders } = await supabaseAdmin
            .from('future_reminders')
            .select(`
                id, recipient_email, recipient_name, delivery_method, access_token, title, message, creator_user_id, scheduled_delivery_at, due_notification_sent_at, usuarios ( nombre )
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_delivery_at', nowISO)
            .is('due_notification_sent_at', null);

        if (dueReminders && dueReminders.length > 0) {
            for (const reminder of dueReminders) {
                if (reminder.delivery_method === 'email') {
                    const creatorName = reminder.usuarios?.nombre ?? null;
                    const sent = await sendReminderEmail({
                        id: reminder.id,
                        recipient_email: reminder.recipient_email,
                        recipient_name: reminder.recipient_name,
                        access_token: reminder.access_token,
                        title: reminder.title,
                        message: reminder.message,
                        creator_name: creatorName,
                        type: 'due',
                        scheduled_delivery_at: reminder.scheduled_delivery_at,
                    });
                    if (sent) {
                        await supabaseAdmin
                            .from('future_reminders')
                            .update({ due_notification_sent_at: nowISO, status: 'available', updated_at: nowISO })
                            .eq('id', reminder.id);
                    }
                } else if (reminder.delivery_method === 'qr_code') {
                    await supabaseAdmin
                        .from('future_reminders')
                        .update({ due_notification_sent_at: nowISO, status: 'available', updated_at: nowISO })
                        .eq('id', reminder.id);
                }
            }
        }

        // 3. Enviar recordatorio cada 3 días si no se abrió la cápsula
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { data: reminderReminders } = await supabaseAdmin
            .from('future_reminders')
            .select(`
                id, recipient_email, recipient_name, delivery_method, access_token, title, message, creator_user_id, scheduled_delivery_at, last_reminder_sent_at, opened_at, due_notification_sent_at, usuarios ( nombre )
            `)
            .eq('status', 'available')
            .is('opened_at', null)
            .not('due_notification_sent_at', 'is', null)
            .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${threeDaysAgo}`);

        if (reminderReminders && reminderReminders.length > 0) {
            for (const reminder of reminderReminders) {
                if (reminder.delivery_method === 'email') {
                    const creatorName = reminder.usuarios?.nombre ?? null;
                    const sent = await sendReminderEmail({
                        id: reminder.id,
                        recipient_email: reminder.recipient_email,
                        recipient_name: reminder.recipient_name,
                        access_token: reminder.access_token,
                        title: reminder.title,
                        message: reminder.message,
                        creator_name: creatorName,
                        type: 'reminder',
                        scheduled_delivery_at: reminder.scheduled_delivery_at,
                    });
                    if (sent) {
                        await supabaseAdmin
                            .from('future_reminders')
                            .update({ last_reminder_sent_at: nowISO, updated_at: nowISO })
                            .eq('id', reminder.id);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ message: 'Reminders processed.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Function error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
})
