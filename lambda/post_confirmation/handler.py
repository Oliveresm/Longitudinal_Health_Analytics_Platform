import boto3
import os

client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    """
    Este código se ejecuta automáticamente cuando un usuario confirma su email.
    """
    print(f"Evento recibido: {event}")
    
    # Solo actuamos si el evento es de confirmación de registro
    if event['triggerSource'] == 'PostConfirmation_ConfirmSignUp':
        try:
            user_pool_id = event['userPoolId']
            username = event['userName']
            
            print(f"Asignando usuario {username} al grupo Patients...")
            
            client.admin_add_user_to_group(
                UserPoolId=user_pool_id,
                Username=username,
                GroupName='Patients'
            )
            
            print("✅ Asignación exitosa.")
            
        except Exception as e:
            print(f"❌ Error asignando grupo: {e}")
            # No lanzamos error para no bloquear el login del usuario, 
            # pero queda registrado en los logs.
            
    return event