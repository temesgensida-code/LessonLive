import resend
from django.conf import settings

def send_verification_email(user, token, frontend_base_url):
    verify_url = f"{frontend_base_url}/verify-email?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f4f5;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background-color: #2563eb;
                color: #ffffff;
                padding: 20px;
                text-align: center;
            }}
            .content {{
                padding: 30px;
                color: #333333;
                line-height: 1.6;
            }}
            .button {{
                display: inline-block;
                padding: 12px 24px;
                margin: 20px 0;
                background-color: #2563eb;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Welcome to LessonLive!</h2>
            </div>
            <div class="content">
                <p>Hi {user.first_name},</p>
                <p>Thank you for registering as a teacher on LessonLive. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="{verify_url}" class="button">Verify My Email</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="{verify_url}">{verify_url}</a></p>
                <p>This link will expire in 12 hours.</p>
            </div>
            <div class="footer">
                <p>If you didn't request this email, you can safely ignore it.</p>
                <p>&copy; LessonLive. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        resend.api_key = settings.RESEND_API_KEY
        from_email = settings.RESEND_FROM_EMAIL
        params = {
            "from": from_email,
            "to": [user.email],
            "subject": "Verify your email - LessonLive",
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        return True, email
    except Exception as e:
        return False, str(e)
