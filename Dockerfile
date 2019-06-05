FROM continuumio/miniconda3

RUN conda install -y pytorch-cpu torchvision-cpu -c pytorch
RUN conda install flask

COPY . .

CMD ["python", "server.py"]