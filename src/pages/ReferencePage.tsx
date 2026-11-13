import { useNavigate } from 'react-router-dom';
import { ReferenceView } from '../components/ReferenceView';
import { useAppAuth } from '../context/AppAuthContext';

export function ReferencePage() {
  const navigate = useNavigate();
  const {
    referenceEntries,
    getIdToken,
    saveReferenceEntry,
    deleteReferenceEntry,
  } = useAppAuth();

  return (
    <ReferenceView
      entries={referenceEntries}
      getIdToken={getIdToken}
      onGenerated={(entry) => void saveReferenceEntry(entry)}
      onDeleteEntry={(entryId) => void deleteReferenceEntry(entryId)}
      onStartTrackForLanguage={() => navigate('/generate')}
    />
  );
}
