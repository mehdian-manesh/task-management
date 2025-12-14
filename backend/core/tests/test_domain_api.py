"""
Tests for Domain API endpoints
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Domain, Project, Task


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user():
    return User.objects.create_user(username='user', password='password', email='user@test.com')


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(username='admin', password='password', email='admin@test.com')


@pytest.fixture
def authenticated_regular_client(api_client, regular_user):
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.mark.django_db
class TestDomainList:
    """Tests for GET /api/domains/"""
    
    def test_list_domains_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list domains"""
        response = api_client.get(reverse('domain-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_domains_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot list domains"""
        response = authenticated_regular_client.get(reverse('domain-list'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_list_domains_as_admin(self, authenticated_admin_client):
        """Test admin can list domains"""
        Domain.objects.create(name='Domain 1')
        Domain.objects.create(name='Domain 2')
        
        response = authenticated_admin_client.get(reverse('domain-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        domains = response.data.get('results', response.data)
        assert len(domains) == 2
    
    def test_list_domains_with_counts(self, authenticated_admin_client):
        """Test domain list includes counts"""
        domain = Domain.objects.create(name='Test Domain')
        Project.objects.create(name='Project 1', domain=domain)
        Project.objects.create(name='Project 2', domain=domain)
        Task.objects.create(name='Task 1', domain=domain)
        user = User.objects.create_user(username='testuser', password='pass')
        user.profile.domain = domain
        user.profile.save()
        
        response = authenticated_admin_client.get(reverse('domain-list'))
        
        assert response.status_code == status.HTTP_200_OK
        domains = response.data.get('results', response.data)
        domain_data = domains[0]
        assert domain_data['projects_count'] == 2
        assert domain_data['tasks_count'] == 1
        assert domain_data['users_count'] == 1


@pytest.mark.django_db
class TestDomainTree:
    """Tests for GET /api/domains/tree/"""
    
    def test_tree_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot get tree"""
        response = api_client.get(reverse('domain-tree'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_tree_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot get tree"""
        response = authenticated_regular_client.get(reverse('domain-tree'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_tree_as_admin(self, authenticated_admin_client):
        """Test admin can get tree structure"""
        root1 = Domain.objects.create(name='Root 1')
        root2 = Domain.objects.create(name='Root 2')
        child1 = Domain.objects.create(name='Child 1', parent=root1)
        child2 = Domain.objects.create(name='Child 2', parent=root1)
        grandchild = Domain.objects.create(name='Grandchild', parent=child1)
        
        response = authenticated_admin_client.get(reverse('domain-tree'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2  # Two root domains
        
        # Find root1 in response
        root1_data = next((d for d in response.data if d['id'] == root1.id), None)
        assert root1_data is not None
        assert len(root1_data['children']) == 2
        
        # Check child1 has grandchild
        child1_data = next((c for c in root1_data['children'] if c['id'] == child1.id), None)
        assert child1_data is not None
        assert len(child1_data['children']) == 1
        assert child1_data['children'][0]['id'] == grandchild.id


@pytest.mark.django_db
class TestDomainCreate:
    """Tests for POST /api/domains/"""
    
    def test_create_domain_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create domains"""
        data = {'name': 'New Domain'}
        response = api_client.post(reverse('domain-list'), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_domain_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot create domains"""
        data = {'name': 'New Domain'}
        response = authenticated_regular_client.post(reverse('domain-list'), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_root_domain_as_admin(self, authenticated_admin_client):
        """Test admin can create root domain"""
        data = {'name': 'Root Domain'}
        response = authenticated_admin_client.post(reverse('domain-list'), data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Root Domain'
        assert response.data['parent'] is None
        assert response.data['path'] == '/'
        assert Domain.objects.filter(name='Root Domain').exists()
    
    def test_create_child_domain_as_admin(self, authenticated_admin_client):
        """Test admin can create child domain"""
        parent = Domain.objects.create(name='Parent')
        data = {'name': 'Child Domain', 'parent': parent.id}
        response = authenticated_admin_client.post(reverse('domain-list'), data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Child Domain'
        assert response.data['parent'] == parent.id
        assert response.data['path'] == f'/{parent.id}/'
        
        child = Domain.objects.get(name='Child Domain')
        assert child.parent == parent
        assert child in parent.children.all()


@pytest.mark.django_db
class TestDomainUpdate:
    """Tests for PATCH/PUT /api/domains/{id}/"""
    
    def test_update_domain_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot update domains"""
        domain = Domain.objects.create(name='Domain')
        data = {'name': 'Updated Domain'}
        response = api_client.patch(reverse('domain-detail', kwargs={'pk': domain.id}), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_domain_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot update domains"""
        domain = Domain.objects.create(name='Domain')
        data = {'name': 'Updated Domain'}
        response = authenticated_regular_client.patch(reverse('domain-detail', kwargs={'pk': domain.id}), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_domain_name_as_admin(self, authenticated_admin_client):
        """Test admin can update domain name"""
        domain = Domain.objects.create(name='Original Name')
        data = {'name': 'Updated Name'}
        response = authenticated_admin_client.patch(reverse('domain-detail', kwargs={'pk': domain.id}), data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        domain.refresh_from_db()
        assert domain.name == 'Updated Name'
    
    def test_update_domain_parent_as_admin(self, authenticated_admin_client):
        """Test admin can move domain to different parent"""
        root1 = Domain.objects.create(name='Root 1')
        root2 = Domain.objects.create(name='Root 2')
        child = Domain.objects.create(name='Child', parent=root1)
        
        original_path = child.path
        
        data = {'parent': root2.id}
        response = authenticated_admin_client.patch(reverse('domain-detail', kwargs={'pk': child.id}), data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        child.refresh_from_db()
        assert child.parent == root2
        assert child.path == f'/{root2.id}/'
        assert child.path != original_path


@pytest.mark.django_db
class TestDomainDelete:
    """Tests for DELETE /api/domains/{id}/"""
    
    def test_delete_domain_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot delete domains"""
        domain = Domain.objects.create(name='Domain')
        response = api_client.delete(reverse('domain-detail', kwargs={'pk': domain.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_domain_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot delete domains"""
        domain = Domain.objects.create(name='Domain')
        response = authenticated_regular_client.delete(reverse('domain-detail', kwargs={'pk': domain.id}))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_delete_empty_domain_as_admin(self, authenticated_admin_client):
        """Test admin can delete empty domain"""
        domain = Domain.objects.create(name='Domain')
        domain_id = domain.id
        response = authenticated_admin_client.delete(reverse('domain-detail', kwargs={'pk': domain.id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Domain.objects.filter(id=domain_id).exists()
    
    def test_delete_domain_with_children_as_admin(self, authenticated_admin_client):
        """Test deleting domain cascades to children"""
        root = Domain.objects.create(name='Root')
        child1 = Domain.objects.create(name='Child 1', parent=root)
        child2 = Domain.objects.create(name='Child 2', parent=root)
        
        response = authenticated_admin_client.delete(reverse('domain-detail', kwargs={'pk': root.id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Domain.objects.filter(id=root.id).exists()
        assert not Domain.objects.filter(id=child1.id).exists()
        assert not Domain.objects.filter(id=child2.id).exists()
    
    def test_delete_domain_with_projects_fails(self, authenticated_admin_client):
        """Test that deleting domain with projects fails (PROTECT)"""
        domain = Domain.objects.create(name='Domain')
        Project.objects.create(name='Project', domain=domain)
        
        response = authenticated_admin_client.delete(reverse('domain-detail', kwargs={'pk': domain.id}))
        
        # Should fail due to PROTECT constraint
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'detail' in response.data or 'error' in str(response.data).lower()
        # Domain should still exist
        assert Domain.objects.filter(id=domain.id).exists()
