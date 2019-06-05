import matplotlib.pyplot as plt
from IPython import display

def print_callback(epoch, train_losses, validation_losses):
    """
    """
    tl, vl = train_losses[-1], validation_losses[-1]
    print(f"\r[Epoch {epoch + 1}] Running_loss: {tl:.4f} Val loss: {vl:.4f}", end = "")
    
def plot_callback(epoch, train_losses, validation_losses):
    """
    """
    display.clear_output(wait=True)
    fig, ax = plt.subplots()
    
    fig.set_figwidth(10)
    fig.set_figheight(6.17)
    
    ax.plot([i for i in range(epoch + 1)], train_losses, label = "train")
    ax.plot([i for i in range(epoch + 1)], validation_losses, label = "val")
    
    ax.legend()
    
    plt.show()