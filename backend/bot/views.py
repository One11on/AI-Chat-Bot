from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .services import GeminiChatService
import uuid
import json
import re

# ===== AUTHENTICATION VIEWS =====
@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    
    # Validation
    if not username or not email or not password:
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Email validation
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'User created successfully',
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'Login successful',
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email
        })
    else:
        return Response({'error': 'Invalid username or password'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Logout successful'})
    except:
        return Response({'message': 'Logout successful'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_auth(request):
    return Response({
        'isAuthenticated': True,
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def hello_world(request):
    return Response({'message': 'Hello from Django!'})

# ===== CHAT VIEWS =====
class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.all()
    serializer_class = ChatSessionSerializer
    
    def get_permissions(self):
        """
        Allow unauthenticated access for creating sessions and sending messages,
        but require authentication for listing sessions.
        """
        if self.action in ['create', 'send_message', 'get_messages']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Authenticated users see their sessions, unauthenticated see all (for demo)
        In production, you might want to restrict this more.
        """
        if self.request.user.is_authenticated:
            return ChatSession.objects.filter(user=self.request.user)
        return ChatSession.objects.all()
    
    def perform_create(self, serializer):
        """Assign user to session if authenticated"""
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
    
    def create(self, request):
        session_id = str(uuid.uuid4())
        
        # Create session with user if authenticated
        if request.user.is_authenticated:
            session = ChatSession.objects.create(
                session_id=session_id,
                user=request.user
            )
        else:
            session = ChatSession.objects.create(session_id=session_id)
            
        serializer = self.get_serializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def send_message(self, request):
        session_id = request.data.get('session_id')
        user_message = request.data.get('message', '').strip()
        
        if not session_id or not user_message:
            return Response(
                {'error': 'session_id and message are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = ChatSession.objects.get(session_id=session_id)
            
            # Optional: Check if user owns this session (for authenticated users)
            if request.user.is_authenticated and session.user and session.user != request.user:
                return Response(
                    {'error': 'Access denied to this chat session'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Save user message
            user_msg = ChatMessage.objects.create(
                session=session,
                message=user_message,
                is_user=True
            )
            
            # Get bot response
            chat_service = GeminiChatService()
            bot_response = chat_service.get_response(session, user_message)
            
            # Save bot response
            bot_msg = ChatMessage.objects.create(
                session=session,
                message=bot_response,
                is_user=False
            )
            
            # Return both messages
            return Response({
                'user_message': ChatMessageSerializer(user_msg).data,
                'bot_message': ChatMessageSerializer(bot_msg).data,
                'session_id': session_id
            })
            
        except ChatSession.DoesNotExist:
            return Response({'error': 'Chat session not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def get_messages(self, request):
        session_id = request.GET.get('session_id')
        if not session_id:
            return Response({'error': 'session_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = ChatSession.objects.get(session_id=session_id)
            
            # Optional: Check if user owns this session (for authenticated users)
            if request.user.is_authenticated and session.user and session.user != request.user:
                return Response(
                    {'error': 'Access denied to this chat session'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            messages = session.messages.all().order_by('timestamp')
            serializer = ChatMessageSerializer(messages, many=True)
            return Response({
                'messages': serializer.data,
                'session_id': session_id
            })
        except ChatSession.DoesNotExist:
            return Response({'messages': []})