import { Request, Response, NextFunction } from 'express';
import { supabaseServer } from '../lib/supabaseServerClient';

// Extension du type Request Express pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware d'authentification pour les routes Supabase
 * Vérifie le token JWT Supabase dans le header Authorization
 * SÉCURISÉ : Appelle Supabase Auth API pour vérifier la signature JWT
 */
export const authenticateSupabase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Vérifier que Supabase est configuré
    if (!supabaseServer) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Supabase n\'est pas configuré. Voir SUPABASE_SETUP.md',
      });
    }

    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token d\'authentification manquant',
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // SÉCURITÉ : Vérifier le token avec Supabase Auth API
    // Cela vérifie la signature JWT avec la clé publique Supabase
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Token invalide ou expiré',
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email || '',
    };

    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    return res.status(401).json({
      error: 'authentication_failed',
      message: 'Échec de l\'authentification',
    });
  }
};

/**
 * Middleware optionnel : vérifier si l'utilisateur est admin
 * (peut être utilisé pour des routes d'administration)
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentification requise',
    });
  }

  // TODO: Vérifier le rôle admin dans la base Supabase
  // const { data: userProfile } = await supabase
  //   .from('users')
  //   .select('role')
  //   .eq('id', req.user.id)
  //   .single();
  
  // if (userProfile?.role !== 'admin') {
  //   return res.status(403).json({
  //     error: 'forbidden',
  //     message: 'Accès réservé aux administrateurs',
  //   });
  // }

  next();
};
