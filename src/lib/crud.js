import { useState } from 'react';
import { App, Form } from 'antd';
import { del, patch, post } from './api';

/** Logique commune aux pages de gestion (modale d'édition, enregistrement, suppression). */
export function useEdition(chemin, { versFormulaire = (x) => x, versApi = (x) => x, defauts = {} } = {}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [edition, setEdition] = useState(null); // null = fermé, {} = création
  const [enregistrement, setEnregistrement] = useState(false);

  const ouvrir = (item) => {
    setEdition(item ?? {});
    form.resetFields();
    form.setFieldsValue(item ? versFormulaire(item) : defauts);
  };
  const fermer = () => setEdition(null);

  const enregistrer = async (valeurs) => {
    setEnregistrement(true);
    try {
      const corps = versApi(valeurs, edition);
      if (edition?.id) await patch(`/${chemin}/${edition.id}`, corps);
      else await post(`/${chemin}`, corps);
      message.success(edition?.id ? 'Modifications enregistrées' : 'Ajouté avec succès');
      fermer();
    } catch (e) {
      message.error(e.message);
    } finally {
      setEnregistrement(false);
    }
  };

  const supprimer = async (id) => {
    try { await del(`/${chemin}/${id}`); message.success('Supprimé'); } catch (e) { message.error(e.message); }
  };

  const basculer = async (id, champ, valeur) => {
    try { await patch(`/${chemin}/${id}`, { [champ]: valeur }); } catch (e) { message.error(e.message); }
  };

  return { form, edition, ouvrir, fermer, enregistrer, supprimer, basculer, enregistrement };
}
