"""
Utility functions for domain-based access control
"""
from django.db.models import Q
from .models import Domain


def get_user_domain(user):
    """Get the domain of a user"""
    if hasattr(user, 'profile') and user.profile.domain:
        return user.profile.domain
    return None


def get_user_accessible_domain_ids(user):
    """
    Get all domain IDs that a user can access (their domain and all subdomains).
    Returns empty list if user has no domain.
    """
    user_domain = get_user_domain(user)
    if not user_domain:
        return []
    return user_domain.get_all_descendant_ids()


def filter_by_domain(queryset, user, domain_field='domain'):
    """
    Filter a queryset to only include items accessible by the user's domain.
    Admins see everything, regular users see only their domain and subdomains.
    """
    if user.is_staff:
        return queryset
    
    accessible_domain_ids = get_user_accessible_domain_ids(user)
    if not accessible_domain_ids:
        # User has no domain, return empty queryset
        return queryset.none()
    
    return queryset.filter(**{f'{domain_field}__id__in': accessible_domain_ids})


def user_can_access_domain(user, domain):
    """
    Check if a user can access a specific domain (their domain or subdomains only, not parent domains).
    Admins can access all domains.
    """
    if user.is_staff:
        return True
    
    user_domain = get_user_domain(user)
    if not user_domain:
        return False
    
    if user_domain == domain:
        return True
    
    # Check if domain is a descendant of user's domain (user can access subdomains)
    if user_domain.is_ancestor_of(domain):
        return True
    
    # Users should NOT access parent domains - only their domain and subdomains
    return False


def user_can_access_entity(user, entity, domain_field='domain'):
    """
    Check if a user can access a specific entity based on domain.
    Admins can access all entities.
    """
    if user.is_staff:
        return True
    
    entity_domain = getattr(entity, domain_field, None)
    if not entity_domain:
        # Entity has no domain - only admins can access
        return False
    
    return user_can_access_domain(user, entity_domain)
