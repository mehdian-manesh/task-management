from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'profile_picture', 'has_profile_picture']
    list_filter = ['user__is_active', 'user__is_staff']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['user']
    
    def has_profile_picture(self, obj):
        return bool(obj.profile_picture)
    has_profile_picture.boolean = True
    has_profile_picture.short_description = 'Has Profile Picture'
