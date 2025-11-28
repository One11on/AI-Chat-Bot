from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sessions', views.ChatSessionViewSet)

urlpatterns = [
    # Authentication endpoints
    path('api/signup/', views.signup, name='signup'),
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/check-auth/', views.check_auth, name='check_auth'),
    path('api/hello/', views.hello_world, name='hello_world'),
    
    # Chat endpoints (include router URLs)
    path('api/', include(router.urls)),
]