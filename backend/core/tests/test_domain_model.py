"""
Tests for Domain model and organizational structure
"""
import pytest
from django.contrib.auth.models import User
from core.models import Domain, Project, Task


@pytest.mark.django_db
class TestDomainModel:
    """Tests for Domain model"""
    
    def test_domain_creation_root(self):
        """Test creating a root domain (no parent)"""
        domain = Domain.objects.create(name='Root Domain')
        
        assert domain.name == 'Root Domain'
        assert domain.parent is None
        assert domain.path == '/'
        assert domain.created_at is not None
        assert domain.updated_at is not None
    
    def test_domain_creation_with_parent(self):
        """Test creating a domain with a parent"""
        root = Domain.objects.create(name='Root')
        child = Domain.objects.create(name='Child', parent=root)
        
        assert child.parent == root
        assert child.path == f'/{root.id}/'
        assert child in root.children.all()
    
    def test_domain_nested_children(self):
        """Test creating nested domain hierarchy"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        level3 = Domain.objects.create(name='Level 3', parent=level2)
        
        assert level1.path == f'/{root.id}/'
        assert level2.path == f'/{root.id}/{level1.id}/'
        assert level3.path == f'/{root.id}/{level1.id}/{level2.id}/'
        
        assert level1 in root.children.all()
        assert level2 in level1.children.all()
        assert level3 in level2.children.all()
    
    def test_domain_get_ancestors(self):
        """Test getting ancestor domains"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        
        ancestors = level2.get_ancestors()
        ancestor_ids = list(ancestors.values_list('id', flat=True))
        
        assert root.id in ancestor_ids
        assert level1.id in ancestor_ids
        assert level2.id not in ancestor_ids
    
    def test_domain_get_descendants(self):
        """Test getting descendant domains"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2a = Domain.objects.create(name='Level 2a', parent=level1)
        level2b = Domain.objects.create(name='Level 2b', parent=level1)
        level3 = Domain.objects.create(name='Level 3', parent=level2a)
        
        descendants = root.get_descendants()
        descendant_ids = list(descendants.values_list('id', flat=True))
        
        assert level1.id in descendant_ids
        assert level2a.id in descendant_ids
        assert level2b.id in descendant_ids
        assert level3.id in descendant_ids
        assert root.id not in descendant_ids
    
    def test_domain_get_all_descendant_ids(self):
        """Test getting all descendant IDs including self"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        
        all_ids = root.get_all_descendant_ids()
        
        assert root.id in all_ids
        assert level1.id in all_ids
        assert level2.id in all_ids
        assert len(all_ids) == 3
    
    def test_domain_is_ancestor_of(self):
        """Test checking if domain is ancestor of another"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        
        assert root.is_ancestor_of(level1) is True
        assert root.is_ancestor_of(level2) is True
        assert level1.is_ancestor_of(level2) is True
        assert level2.is_ancestor_of(root) is False
        assert level1.is_ancestor_of(root) is False
    
    def test_domain_is_descendant_of(self):
        """Test checking if domain is descendant of another"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        
        assert level2.is_descendant_of(root) is True
        assert level2.is_descendant_of(level1) is True
        assert level1.is_descendant_of(root) is True
        assert root.is_descendant_of(level1) is False
    
    def test_domain_move_parent(self):
        """Test moving a domain to a different parent"""
        root1 = Domain.objects.create(name='Root 1')
        root2 = Domain.objects.create(name='Root 2')
        child = Domain.objects.create(name='Child', parent=root1)
        
        original_path = child.path
        
        # Move child to root2
        child.parent = root2
        child.save()
        
        child.refresh_from_db()
        assert child.parent == root2
        assert child.path == f'/{root2.id}/'
        assert child.path != original_path
    
    def test_domain_move_updates_children_paths(self):
        """Test that moving a domain updates all children paths"""
        root = Domain.objects.create(name='Root')
        level1 = Domain.objects.create(name='Level 1', parent=root)
        level2 = Domain.objects.create(name='Level 2', parent=level1)
        level3 = Domain.objects.create(name='Level 3', parent=level2)
        
        original_level2_path = level2.path
        original_level3_path = level3.path
        
        # Move level1 to be a root
        level1.parent = None
        level1.save()
        
        level2.refresh_from_db()
        level3.refresh_from_db()
        
        assert level2.path != original_level2_path
        assert level3.path != original_level3_path
        assert level2.path == f'/{level1.id}/'
        assert level3.path == f'/{level1.id}/{level2.id}/'
    
    def test_domain_with_projects(self):
        """Test domain relationship with projects"""
        domain = Domain.objects.create(name='Domain')
        project1 = Project.objects.create(name='Project 1', domain=domain)
        project2 = Project.objects.create(name='Project 2', domain=domain)
        
        assert domain.projects.count() == 2
        assert project1 in domain.projects.all()
        assert project2 in domain.projects.all()
    
    def test_domain_with_tasks(self):
        """Test domain relationship with tasks"""
        domain = Domain.objects.create(name='Domain')
        task1 = Task.objects.create(name='Task 1', domain=domain)
        task2 = Task.objects.create(name='Task 2', domain=domain)
        
        assert domain.tasks.count() == 2
        assert task1 in domain.tasks.all()
        assert task2 in domain.tasks.all()
    
    def test_domain_with_users(self):
        """Test domain relationship with users"""
        from accounts.models import UserProfile
        
        domain = Domain.objects.create(name='Domain')
        user1 = User.objects.create_user(username='user1', password='pass')
        user2 = User.objects.create_user(username='user2', password='pass')
        
        user1.profile.domain = domain
        user1.profile.save()
        user2.profile.domain = domain
        user2.profile.save()
        
        assert domain.users.count() == 2
        assert user1.profile in domain.users.all()
        assert user2.profile in domain.users.all()
    
    def test_domain_protect_on_delete(self):
        """Test that domain cannot be deleted if it has projects or tasks"""
        domain = Domain.objects.create(name='Domain')
        project = Project.objects.create(name='Project', domain=domain)
        task = Task.objects.create(name='Task', domain=domain)
        
        # Should raise ProtectedError when trying to delete
        from django.db.models.deletion import ProtectedError
        with pytest.raises(ProtectedError):
            domain.delete()
        
        # Delete project and task first
        project.delete()
        task.delete()
        
        # Now domain can be deleted
        domain.delete()
        assert not Domain.objects.filter(id=domain.id).exists()
    
    def test_domain_cascade_delete_children(self):
        """Test that deleting a domain cascades to children"""
        root = Domain.objects.create(name='Root')
        child1 = Domain.objects.create(name='Child 1', parent=root)
        child2 = Domain.objects.create(name='Child 2', parent=root)
        grandchild = Domain.objects.create(name='Grandchild', parent=child1)
        
        child1_id = child1.id
        child2_id = child2.id
        grandchild_id = grandchild.id
        
        # Delete root - should cascade to all children
        root.delete()
        
        assert not Domain.objects.filter(id=root.id).exists()
        assert not Domain.objects.filter(id=child1_id).exists()
        assert not Domain.objects.filter(id=child2_id).exists()
        assert not Domain.objects.filter(id=grandchild_id).exists()
