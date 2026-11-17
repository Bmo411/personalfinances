from django.urls import path
from .views import KeysView, RevokeKeyView, RecordsView, SummaryView, PreviewImportView, ConfirmImportView, MathSyncView
from .views import SessionView

urlpatterns = [
    path('session/', SessionView.as_view()),
    path('keys/', KeysView.as_view()),
    path('keys/<int:pk>/revoke/', RevokeKeyView.as_view()),
    path('records/<str:resource>/', RecordsView.as_view()),
    path('records/<str:resource>/<int:pk>/', RecordsView.as_view()),
    path('summary/<str:area>/', SummaryView.as_view()),
    path('imports/preview/', PreviewImportView.as_view()),
    path('imports/<uuid:pk>/confirm/', ConfirmImportView.as_view()),
    path('math/sync/', MathSyncView.as_view()),
]
