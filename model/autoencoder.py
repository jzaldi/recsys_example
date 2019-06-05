import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import TensorDataset, DataLoader

class MovieLensAutoencoder(nn.Module):
    """ Autoencoder para aplicar al dataset movilens de cara a tener un 
    sistema de recomendación.
    Attributes:
        encoder(torch.nn.Module): Red neuronal que se encarga de transformar
            un vector a una dimensionalidad reducida.
        decoder(torch.nn.Module): Red neuronal que hace la operación inversa,
            transformar el vector reducido a su dimensionalidad original.
    """
    
    def __init__(self, n_users, n_movies, h_dim = 264, ls_dim = 128):
        """ Constructor.
        Args:
            n_users (int): Número de usuarios.
            n_movies (int): Número de items.
            h_dim (int): Neuronas de la capa oculta del encoder y decoder.
            ls_dim (int): Dimensionalidad del espacio latente.
        """
        super().__init__()
        
        self.n_users = n_users
        self.n_movies = n_movies

        self.encoder = nn.Sequential(
            nn.Linear(n_movies, h_dim),
            nn.LeakyReLU(),
            nn.Linear(h_dim, ls_dim)
        )
        
        self.decoder = nn.Sequential(
            nn.Linear(ls_dim, h_dim),
            nn.LeakyReLU(),
            nn.Linear(h_dim, n_movies),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        """ Propaga hacia delante el tensor x.
        Args:
            x (torch.FloatTensor): Tensor de entrada con el vector de
                películas vistas por el usuario.
        Return:
            torch.FloatTensor con el vector reconstruido tras pasar por
                el autoencoder.
        """
        return self.decoder(self.encoder(x))
    
    def fit(self, x, lr = 1e-3, n_epoch = 200, val_frac = 0.2, 
            early_stopping = 20, callbacks = [], loss_function = None):
        """ Función de entrenamiento del autoencoder.
        Args:
            x (torch.FloatTensor): Matriz de interacciones. Los usuarios son
                las filas.
            lr (float): Learning rate para el optimizador Adam.
            n_epoch (int): Número máximo de epoch a realizar.
            val_frac (float): Fracción a utilizar como validación.
            early_stopping (int): Número de epoch que pueden pasar sin que
                el modelo mejore (métrica de validación).
            callbacks (list[function]): Lista de funciones con signature
                epoch, train_losses, validation_losses que se ejecutan al 
                completar un epoch.
        Todo:
            Dividir en más métodos, es muy largo. No escala porque coge una
            matriz densa de entrada.
        """
        
        # Construimos el optimizador y la función de pérdida.
        optimizer = optim.Adam(self.parameters(), lr=lr)
        
        if loss_function is None:
            loss_function = nn.MSELoss()
        
        # Dividimos el dataset en entrenamiento y validación.
        val_idx= np.random.choice(
            np.arange(x.shape[0]), 
            size = int(val_frac * x.shape[0]), 
            replace=False
        )
        dataset = TensorDataset(x[-val_idx])
        x_val = x[val_idx]
        
        # Objetos necesarios para el bucle de entrenamiento.
        train_losses = [] # Perdidas de entrenamiento en cada epoch.
        validation_losses = [] # Pérdidas de validación en cada epoch.
        min_loss = None # Perdida mínima de validación durante el entren.
        best_state_dict = None # Mejores parámetros por el momento.
        patience = 0 # Veces que la pérdida en el epoch siguiente no ha 
                     # mejorado el mínimo epoch.
        
        for epoch in range(n_epoch): # Iteramos el número de epochs.
            
            data_loader = DataLoader(dataset, shuffle=True, batch_size=32)
            
            train_loss = 0
            running_loss = 0
            
            self.train()
            
            for i, (x_batch,) in enumerate(data_loader):
                
                loss = loss_function(self(x_batch), x_batch)
                running_loss += loss.item()
                train_loss = running_loss / (i + 1)
                
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
            self.eval()
            
            val_loss = loss_function(self(x_val), x_val)
            
            if min_loss is None or val_loss < min_loss:
                min_loss = val_loss
                patience = 0
                best_state_dict = self.state_dict()
            else:
                patience += 1
            
            if patience > early_stopping:
                self.load_state_dict(best_state_dict)
                print(f"Early stopping reached at epoch {epoch + 1}.")
                print(f"Best val_loss {min_loss:.4f}.")
                return
                
            
            train_losses.append(train_loss)
            validation_losses.append(val_loss)
            
            for callback in callbacks:
                callback(epoch, train_losses, validation_losses)
        
    def predict(self, iids = None):
        """
        """
        self.eval()
        x = np.zeros(self.n_movies)
        if iids is not None:
            x[iids] = 1
        x = torch.FloatTensor(x).unsqueeze(0)
        x_1 = self(x).detach().numpy()[0]
        return x_1 